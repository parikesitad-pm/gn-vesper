/**
 * Native Groq adapter. Groq speaks the OpenAI chat-completions shape, but it is a first-class provider here:
 * its own key, its own model variable, and the fast path for intent classification.
 *
 * `openai/gpt-oss-20b` is the current production model on GroqCloud and a good trade for short classification
 * turns. It is a reasoning model, so the adapter asks for low reasoning effort and caps completion tokens; the
 * response's `reasoning` field is deliberately ignored and never reaches the browser.
 */
import type { Env, Provider } from "./types";

const BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

export function groqProvider(env: Env): Provider | null {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = env.VESPER_GROQ_MODEL?.trim() || DEFAULT_MODEL;

  return {
    id: "groq",
    model,
    async generate(system, input, options) {
      const reasoning = model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {};
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: input },
          ],
          temperature: 0,
          max_completion_tokens: options?.maxOutputTokens ?? 48,
          ...reasoning,
        }),
        signal: options?.signal ?? AbortSignal.timeout(options?.timeoutMs ?? 8000),
      });
      if (!res.ok) throw new Error(`groq-${res.status}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("groq-empty");
      return text;
    },
  };
}
