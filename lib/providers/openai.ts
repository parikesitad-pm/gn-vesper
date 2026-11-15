/**
 * OpenAI-compatible adapter. One adapter covers OpenAI itself and anything that speaks the same chat-completions
 * shape (Groq, Mistral, a local server) through `VESPER_OPENAI_BASE_URL`, so swapping providers is configuration,
 * not code.
 */
import type { Env, Provider } from "./types";

const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export function openaiProvider(env: Env): Provider | null {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = env.VESPER_OPENAI_MODEL || DEFAULT_MODEL;
  const base = (env.VESPER_OPENAI_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");

  return {
    id: "openai",
    model,
    async classify(system, input, signal) {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: input },
          ],
          temperature: 0,
          max_tokens: 24,
        }),
        signal: signal ?? AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`openai-${res.status}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("openai-empty");
      return text;
    },
  };
}
