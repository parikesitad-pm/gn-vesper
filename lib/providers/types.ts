/**
 * The provider interface. One shape, so the notch UI and the pipeline never learn which model ran — the
 * `/api/classify` route picks a provider from the environment and reports back which one answered.
 *
 * A provider's only job is: system prompt + one line of user text → one line of text. It never receives a tool,
 * never sees the allow-list, and its reply is validated like any other candidate.
 */
export type ProviderId = "gemini" | "openai";

export type Provider = {
  id: ProviderId;
  model: string;
  /** Returns the model's raw one-line reply. Throws on transport, auth or quota failure. */
  classify: (system: string, input: string, signal?: AbortSignal) => Promise<string>;
};

export type Env = Record<string, string | undefined>;
