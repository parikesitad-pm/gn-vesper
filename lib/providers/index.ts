/**
 * Provider selection, read from the server environment. AI mode is optional: with no key this returns null and
 * the app runs in Demo Mode, which is a first-class state, not a degraded one.
 */
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import type { Env, Provider } from "./types";

export type { Env, Provider, ProviderId } from "./types";
export { SYSTEM_PROMPT } from "../intent/prompt";

/** `VESPER_AI_PROVIDER` pins one provider; otherwise Gemini is preferred, then any OpenAI-compatible key. */
export function selectProvider(env: Env): Provider | null {
  const wanted = env.VESPER_AI_PROVIDER?.trim().toLowerCase();
  if (wanted === "gemini") return geminiProvider(env);
  if (wanted === "openai") return openaiProvider(env);
  return geminiProvider(env) ?? openaiProvider(env);
}

/** Whether AI mode is configured. The client asks the route so the disclosure is always accurate. */
export function aiConfigured(env: Env): boolean {
  return selectProvider(env) !== null;
}
