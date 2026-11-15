/**
 * The browser-side classifier: it posts to this app's own `/api/classify`, which is the only place a provider
 * key exists. A non-OK response (no key, quota, timeout) rejects, so the pipeline can fall back cleanly.
 */
import type { ProviderAttempt } from "@/lib/providers/types";
import type { RawIntent } from "./types";

export type ClassifierReply = {
  /** The raw one-line reply. Untrusted: it is parsed and validated before it can become an action. */
  raw: string;
  /** Which provider answered, for the "measured, not simulated" label in the inspector. */
  provider: string;
  model: string;
  /** Measured round-trip to the provider, in milliseconds. */
  latencyMs: number;
  /** Every provider attempted, including failed fallback attempts. */
  attempts?: ProviderAttempt[];
};

export type Classifier = (input: string, signal?: AbortSignal) => Promise<ClassifierReply>;

/** A candidate the pipeline can hand to `validate` without knowing where it came from. */
export type Candidate = RawIntent & { source: "ai"; raw: string; provider: string; model: string; latencyMs: number };

export class ClassifierError extends Error {
  constructor(
    message: string,
    readonly attempts: ProviderAttempt[] = [],
  ) {
    super(message);
    this.name = "ClassifierError";
  }
}

export const remoteClassifier: Classifier = async (input, signal) => {
  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; attempts?: ProviderAttempt[] };
    throw new ClassifierError(body.error ?? `classify-${res.status}`, body.attempts ?? []);
  }
  const body = (await res.json()) as {
    raw?: string;
    provider?: string;
    model?: string;
    latencyMs?: number;
    attempts?: ProviderAttempt[];
  };
  if (typeof body.raw !== "string") throw new ClassifierError("classify-malformed");
  return {
    raw: body.raw,
    provider: body.provider ?? "unknown",
    model: body.model ?? "unknown",
    latencyMs: typeof body.latencyMs === "number" ? body.latencyMs : 0,
    attempts: body.attempts ?? [],
  };
};
