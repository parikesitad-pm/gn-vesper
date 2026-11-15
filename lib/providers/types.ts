/**
 * The provider interface. One shape, so the routes and the pipeline never learn which model ran — the server
 * picks a chain from the environment and reports back which provider answered, plus every attempt it made.
 *
 * A provider's only job is: system prompt + one block of text → one block of text. It never receives a tool,
 * never sees the action allow-list, and its reply is validated like any other candidate. The same interface
 * serves two very different jobs:
 *
 * - `classify`: a tiny output budget, one line of candidate intent.
 * - `answer`: a larger budget, grounded prose built only from retrieved public source chunks.
 *
 * Keeping both behind `generate` means a new provider is one adapter, and the fallback/observability logic is
 * written once.
 */
export type ProviderId = "groq" | "gemini" | "openai";

export type Env = Record<string, string | undefined>;

export type GenerateOptions = {
  /** Hard cap on the reply. Classification is tiny; a grounded answer gets a little room. */
  maxOutputTokens?: number;
  /** Per-attempt timeout. The chain records a timeout as a failed attempt and tries the next provider. */
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type Provider = {
  id: ProviderId;
  model: string;
  /** Returns the model's raw text. Throws on transport, auth, quota or empty-output failure. */
  generate: (system: string, input: string, options?: GenerateOptions) => Promise<string>;
};

/** One provider attempt, as measured by the server. Shown verbatim in the inspector. */
export type ProviderAttempt = {
  provider: ProviderId;
  model: string;
  ok: boolean;
  latencyMs: number;
  /** A short provider code such as `groq-429`; never a key, body or stack trace. */
  error?: string;
};

/** A successful reply plus the full attempt history that produced it. */
export type ProviderReply = {
  text: string;
  provider: ProviderId;
  model: string;
  /** Measured round-trip of the provider that answered, in milliseconds. */
  latencyMs: number;
  attempts: ProviderAttempt[];
};
