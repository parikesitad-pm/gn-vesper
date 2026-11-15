/**
 * Provider selection and the fallback chain, read from the server environment.
 *
 * Two jobs, two priorities:
 *
 * - **Classify** a short command. Groq first because it is the fast path; Gemini is the fallback when a Groq
 *   call fails before producing text. A failed attempt is recorded, then the next provider gets one try. A
 *   reply never mixes two models.
 * - **Answer** a creator question from retrieved public context. Gemini first, Groq second. This ordering is
 *   fixed even when `VESPER_AI_PROVIDER` pins Groq for classification, because grounded answers are the job
 *   the requirement gives Gemini.
 *
 * AI mode is optional: with no keys the answer route falls back to a deterministic extractive answer, and the
 * classify route stays in Demo Mode. That is a first-class state, not an error.
 */
import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { openaiProvider } from "./openai";
import type { Env, GenerateOptions, Provider, ProviderAttempt, ProviderReply } from "./types";

export type { Env, GenerateOptions, Provider, ProviderAttempt, ProviderId, ProviderReply } from "./types";
export { SYSTEM_PROMPT } from "../intent/prompt";

export type Task = "classify" | "answer";

/** A chain exhausted every configured provider. The attempts are the evidence the inspector shows. */
export class ProviderChainError extends Error {
  readonly attempts: ProviderAttempt[];

  constructor(message: string, attempts: ProviderAttempt[]) {
    super(message);
    this.name = "ProviderChainError";
    this.attempts = attempts;
  }
}

const configured = (env: Env): Provider[] =>
  [groqProvider(env), geminiProvider(env), openaiProvider(env)].filter((p): p is Provider => p !== null);

const byId = (env: Env, id: Provider["id"]): Provider | null => {
  switch (id) {
    case "groq":
      return groqProvider(env);
    case "gemini":
      return geminiProvider(env);
    case "openai":
      return openaiProvider(env);
  }
};

/** The classification order. The env var can pin a provider; unknown values fall back to `auto`. */
export function classifyChain(env: Env): Provider[] {
  const wanted = env.VESPER_AI_PROVIDER?.trim().toLowerCase();
  if (wanted === "groq") {
    return [groqProvider(env), geminiProvider(env)].filter((p): p is Provider => p !== null);
  }
  if (wanted === "gemini" || wanted === "openai") {
    const only = byId(env, wanted);
    return only ? [only] : [];
  }
  const all = configured(env);
  const rank = (p: Provider) => (p.id === "groq" ? 0 : p.id === "gemini" ? 1 : 2);
  return all.sort((a, b) => rank(a) - rank(b));
}

/** The answer order is fixed: Gemini, then Groq, then a generic OpenAI-compatible provider. */
export function answerChain(env: Env): Provider[] {
  return [geminiProvider(env), groqProvider(env), openaiProvider(env)].filter((p): p is Provider => p !== null);
}

export function selectChain(env: Env, task: Task): Provider[] {
  return task === "classify" ? classifyChain(env) : answerChain(env);
}

/** Whether any provider is configured. The page uses this for its honest disclosure. */
export function aiConfigured(env: Env): boolean {
  return configured(env).length > 0;
}

/** Whether grounded answers can use a model. When false, the answer route uses extraction instead. */
export function answerConfigured(env: Env): boolean {
  return answerChain(env).length > 0;
}

/**
 * Runs providers in order until one produces text. Every attempt — success or failure — is measured and kept.
 * If all fail, the error carries the attempt history so the route can return safe evidence instead of a guess.
 */
export async function runChain(
  chain: Provider[],
  system: string,
  input: string,
  options: GenerateOptions = {},
): Promise<ProviderReply> {
  const attempts: ProviderAttempt[] = [];

  for (const provider of chain) {
    const started = Date.now();
    try {
      const text = await provider.generate(system, input, options);
      attempts.push({ provider: provider.id, model: provider.model, ok: true, latencyMs: Date.now() - started });
      return {
        text,
        provider: provider.id,
        model: provider.model,
        latencyMs: Date.now() - started,
        attempts,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "provider-error";
      attempts.push({
        provider: provider.id,
        model: provider.model,
        ok: false,
        latencyMs: Date.now() - started,
        error: message.slice(0, 80),
      });
    }
  }

  const tried = attempts.map((a) => a.provider).join(", ") || "none";
  throw new ProviderChainError(`providers-failed: ${tried}`, attempts);
}
