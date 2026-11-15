/**
 * The pipeline: `input → normalize → local rules → optional AI classification → schema validation →
 * allow-listed action → visible result`, plus a separate read-only knowledge branch for creator questions.
 *
 * This function decides *what* the line means; it does not perform the action (that is `lib/actions`) and does
 * not touch the DOM or the network. Everything it learned is written into a `Trace`, which is exactly what the
 * inspector renders — so what the visitor sees and what the code decided can never drift apart.
 *
 * A knowledge resolution carries a question, not an intent. The page sends it to `/api/ask`, which retrieves
 * from d-ap.my.id; no retrieved text is ever allowed to become an action.
 *
 * Safety lives here as much as in the allow-list: a classifier's reply is a candidate, not an instruction. It
 * is parsed into two short strings and validated; on any failure the pipeline returns no intent at all.
 */
import type { Classifier } from "./classifier";
import { ClassifierError } from "./classifier";
import { isBlank, normalize } from "./normalize";
import { ruleIntent } from "./rules";
import type { Trace, TraceStatus, VesperAction } from "./types";
import { parseRaw, validate } from "./validate";

export type PipelineDeps = {
  /** The optional AI classifier. Absent in Demo Mode, and that is a supported state, not an error. */
  classifier?: Classifier;
  /** Whether AI mode is configured at all. Drives the honest "AI unavailable" disclosure. */
  aiAvailable: boolean;
};

export type Resolution = {
  trace: Trace;
  /** The action to execute, or null when Vesper is unsure or the line is a knowledge request. */
  intent: VesperAction | null;
  /** Present when the line should be answered from the public creator source instead of executing an action. */
  knowledge?: { question: string };
};

/** The status a resolved action puts the notch in. */
export function statusOf(intent: VesperAction): TraceStatus {
  return intent.action === "handoff" ? "handoff" : "ok";
}

const base = (input: string, normalized: string): Pick<Trace, "input" | "normalized"> => ({ input, normalized });

/** Nothing local matched and no classifier answered: say so plainly rather than guess. */
function fallback(input: string, normalized: string, aiAvailable: boolean): Resolution {
  const outcome = aiAvailable
    ? "Local rules did not recognise this and the AI classifier did not answer."
    : "Demo Mode: local rules only, and no rule matched. Add a classifier key to try AI mode.";
  return {
    intent: null,
    trace: {
      ...base(input, normalized),
      path: "fallback",
      validation: { ok: false, reason: "no-intent", raw: { action: "", arg: "" } },
      outcome,
      status: "uncertain",
    },
  };
}

/** Validates a classifier reply and builds its trace. Exported so the AI path stays easy to unit-test. */
export function classifyWith(
  reply: { raw: string; provider: string; model: string; latencyMs: number; attempts?: Trace["attempts"] },
  rawInput: string,
  normalized: string,
): Resolution {
  const candidate = parseRaw(reply.raw);
  const shared = {
    ...base(rawInput, normalized),
    path: "ai" as const,
    rawReply: reply.raw,
    provider: reply.provider,
    model: reply.model,
    latencyMs: reply.latencyMs,
    attempts: reply.attempts,
    parsed: candidate,
  };

  // Read-only routing signal, not an action: the original question goes to public-source retrieval.
  if (candidate.action === "knowledge" && candidate.arg === "question") {
    return {
      intent: null,
      knowledge: { question: normalized },
      trace: {
        ...shared,
        kind: "know",
        validation: { ok: false, reason: "knowledge", raw: candidate },
        outcome: `${reply.provider}/${reply.model} routed this to creator knowledge.`,
        status: "ok",
      },
    };
  }

  const validation = validate(candidate);

  if (!validation.ok) {
    return {
      intent: null,
      trace: {
        ...shared,
        validation,
        outcome: `The classifier replied with something the allow-list rejects (${validation.reason}).`,
        status: "uncertain",
      },
    };
  }

  const arg = validation.intent.arg ? ` ${validation.intent.arg}` : "";
  return {
    intent: validation.intent,
    trace: {
      ...shared,
      validation,
      adapter: validation.intent.action,
      outcome: `${reply.provider}/${reply.model} classified “${validation.intent.action}${arg}”.`,
      status: statusOf(validation.intent),
    },
  };
}

export async function resolve(rawInput: string, deps: PipelineDeps): Promise<Resolution> {
  const normalized = normalize(rawInput);

  if (isBlank(normalized)) {
    return {
      intent: null,
      trace: {
        ...base(rawInput, normalized),
        path: "fallback",
        validation: { ok: false, reason: "empty", raw: { action: "", arg: "" } },
        outcome: "There was nothing to act on.",
        status: "uncertain",
      },
    };
  }

  // 1. Local rules first: free, instant and deterministic. They answer most real lines.
  const rule = ruleIntent(normalized);

  if (rule.kind === "knowledge") {
    return {
      intent: null,
      knowledge: { question: rule.question },
      trace: {
        ...base(rawInput, normalized),
        path: "rule",
        kind: "know",
        validation: { ok: false, reason: "knowledge", raw: { action: "", arg: "" } },
        outcome: "A creator question. It goes to the public-source retrieval route, not to an action.",
        status: "ok",
      },
    };
  }

  if (rule.kind === "action") {
    const validation = validate({ action: rule.intent.action, arg: rule.intent.arg });
    if (validation.ok) {
      const arg = validation.intent.arg ? ` ${validation.intent.arg}` : "";
      return {
        intent: validation.intent,
        trace: {
          ...base(rawInput, normalized),
          path: "rule",
          kind: "act",
          parsed: { action: rule.intent.action, arg: rule.intent.arg },
          validation,
          adapter: validation.intent.action,
          outcome: `Local rule matched “${validation.intent.action}${arg}”.`,
          status: statusOf(validation.intent),
        },
      };
    }
    // A rule that produced something the allow-list rejects is a bug in the rules, not the visitor's fault.
    return {
      intent: null,
      trace: {
        ...base(rawInput, normalized),
        path: "rule",
        kind: "act",
        parsed: { action: rule.intent.action, arg: rule.intent.arg },
        validation,
        outcome: `A local rule produced an action the allow-list rejects (${validation.reason}).`,
        status: "error",
      },
    };
  }

  // 2. A named-but-unnamed intent ("change the theme") is a clarification, never a guess.
  if (rule.kind === "ambiguous") {
    return {
      intent: null,
      trace: {
        ...base(rawInput, normalized),
        path: "rule",
        kind: "act",
        validation: { ok: false, reason: "ambiguous", raw: { action: "", arg: "" } },
        outcome: rule.reason,
        status: "uncertain",
      },
    };
  }

  // 3. Optional AI classification, only when a classifier is configured.
  if (deps.aiAvailable && deps.classifier) {
    try {
      const reply = await deps.classifier(normalized);
      return classifyWith(reply, rawInput, normalized);
    } catch (err) {
      const attempts = err instanceof ClassifierError ? err.attempts : undefined;
      return {
        intent: null,
        trace: {
          ...base(rawInput, normalized),
          path: "fallback",
          attempts,
          validation: { ok: false, reason: "provider-error", raw: { action: "", arg: "" } },
          outcome: `The AI classifier could not answer (${err instanceof Error ? err.message : "unknown"}).`,
          status: "error",
        },
      };
    }
  }

  // 4. No classifier: Demo Mode's honest fallback.
  return fallback(rawInput, normalized, deps.aiAvailable);
}
