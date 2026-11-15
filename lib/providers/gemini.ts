/**
 * Gemini adapter. Uses `generateContent` (not streaming): both jobs are short, so there is nothing to stream.
 *
 * `gemini-3.5-flash-lite` is the verified default: the current Flash family, fast enough for classification and
 * grounded one-paragraph answers. Model names move, so the running model is always configurable and is reported
 * back to the inspector either way. The thinking cap is intentionally omitted: the current Flash-Lite endpoint
 * rejects a zero budget, and a small output cap already keeps the turn cheap.
 */
import type { Env, Provider } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function geminiProvider(env: Env): Provider | null {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = env.VESPER_GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  return {
    id: "gemini",
    model,
    async generate(system, input, options) {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: input }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: options?.maxOutputTokens ?? 48,
          },
        }),
        signal: options?.signal ?? AbortSignal.timeout(options?.timeoutMs ?? 8000),
      });
      if (!res.ok) throw new Error(`gemini-${res.status}`);
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
      if (!text) throw new Error("gemini-empty");
      return text;
    },
  };
}
