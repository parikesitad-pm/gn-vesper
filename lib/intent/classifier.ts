/**
 * The classifier contract.
 *
 * A classifier is any function that turns one line of text into one line of candidate intent. The pipeline does
 * not know or care whether that is a local rule or a model: it validates the reply the same way either way.
 * Provider adapters live in `lib/providers/` and the server route is the only thing that holds a key.
 */
import type { RawIntent } from "./types";

export type ClassifierReply = {
  /** The raw one-line reply. Untrusted: it is parsed and validated before it can become an action. */
  raw: string;
  /** Which provider answered, for the "measured, not simulated" label in the inspector. */
  provider: string;
  model: string;
  /** Measured round-trip to the provider, in milliseconds. */
  latencyMs: number;
};

export type Classifier = (input: string, signal?: AbortSignal) => Promise<ClassifierReply>;

/** A candidate the pipeline can hand to `validate` without knowing where it came from. */
export type Candidate = RawIntent & { source: "ai"; raw: string; provider: string; model: string; latencyMs: number };

/**
 * The browser-side classifier: it posts to this app's own `/api/classify`, which is the only place a provider
 * key exists. A non-OK response (no key, quota, timeout) rejects, so the pipeline can fall back cleanly.
 */
export const remoteClassifier: Classifier = async (input, signal) => {
  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `classify-${res.status}`);
  }
  const body = (await res.json()) as { raw?: string; provider?: string; model?: string; latencyMs?: number };
  if (typeof body.raw !== "string") throw new Error("classify-malformed");
  return {
    raw: body.raw,
    provider: body.provider ?? "unknown",
    model: body.model ?? "unknown",
    latencyMs: typeof body.latencyMs === "number" ? body.latencyMs : 0,
  };
};
