/**
 * The action vocabulary Vesper is allowed to take in this showcase.
 *
 * This is the whole surface area. A visitor's line of natural language is only ever allowed to become one of
 * these values; nothing outside the union can reach an adapter, and no adapter can do anything but change this
 * page or open the one fixed creator URL. Keep the union small and typed — every new action is a deliberate
 * widening of what Vesper can do.
 */
import type { ProviderAttempt } from "../providers/types";
import type { KnowledgeMode, RetrievalInfo, Source } from "../rag/types";

/** Themes the playground can wear. Kept to three so the demo stays legible. */
export type Theme = "dark" | "light" | "neon";
/** Languages the playground copy can switch between. */
export type Language = "en" | "id";
/** In-page destinations. `navigate` scrolls; it never leaves the showcase. */
export type Destination = "playground" | "architecture" | "feedback";

export type VesperAction =
  | { action: "theme"; arg: Theme }
  | { action: "language"; arg: Language }
  | { action: "navigate"; arg: Destination }
  | { action: "motion"; arg: "toggle" }
  | { action: "back"; arg: "" }
  | { action: "help"; arg: "" }
  | { action: "creator"; arg: "site" }
  | { action: "handoff"; arg: "question" };

export type ActionName = VesperAction["action"];

/**
 * The allow-list. Every action names the exact arguments it accepts; `""` means "no argument". Validation reads
 * this map, so an action or argument that is not listed here can never be executed, whatever a model replies.
 */
export const ACTION_ARGS: { [K in ActionName]: readonly VesperAction["arg"][] } = {
  theme: ["dark", "light", "neon"],
  language: ["en", "id"],
  navigate: ["playground", "architecture", "feedback"],
  motion: ["toggle"],
  back: [""],
  help: [""],
  creator: ["site"],
  handoff: ["question"],
};

export const ACTIONS = Object.keys(ACTION_ARGS) as ActionName[];

/** A one-line reply from any classifier, before validation. */
export type RawIntent = { action: string; arg: string };

export type Validation =
  | { ok: true; intent: VesperAction }
  | { ok: false; reason: string; raw: RawIntent };

/** Where a line was resolved. Shown verbatim in the inspector. */
export type ClassificationPath = "rule" | "ai" | "fallback";

export type TraceStatus = "ok" | "answer" | "uncertain" | "handoff" | "error";

/** Everything the inspector is allowed to show. Only observable facts, no hidden reasoning. */
export type Trace = {
  /** The visitor's line, as typed. */
  input: string;
  /** The line after normalisation (what the rules and the model actually saw). */
  normalized: string;
  path: ClassificationPath;
  /** ACT executes one allow-listed adapter; KNOW retrieves read-only public knowledge. */
  kind?: "act" | "know";
  /** Raw one-line reply from the classifier, when one ran. Data, not instructions. */
  rawReply?: string;
  /** Provider and model that answered, when measured. Omitted in Demo Mode. */
  provider?: string;
  model?: string;
  /** Measured round-trip to the classifier or answer provider, in ms. Only set when a call happened. */
  latencyMs?: number;
  /** What the pipeline parsed before validation. */
  parsed?: RawIntent;
  validation: Validation;
  /** The allow-listed adapter that ran, if any. */
  adapter?: ActionName;
  /** Every provider attempted, including failed fallbacks. */
  attempts?: ProviderAttempt[];
  /** Public pages a knowledge answer was built from. */
  sources?: Source[];
  /** Retrieved chunks and their lexical scores. */
  retrieval?: RetrievalInfo[];
  /** How the knowledge answer was produced: identity, grounded, extractive or unsupported. */
  knowledgeMode?: KnowledgeMode;
  /** One line describing what happened, for the visitor. */
  outcome: string;
  status: TraceStatus;
};
