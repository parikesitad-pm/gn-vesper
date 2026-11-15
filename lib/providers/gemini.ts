/**
 * Gemini adapter. Uses `generateContent` (not streaming): classification is one short line, so there is nothing
 * to stream and no reason to hold a connection open.
 */
import type { Env, Provider } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/** Configurable, because model names move; the running model is reported back to the inspector either way. */
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export function geminiProvider(env: Env): Provider | null {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = env.VESPER_GEMINI_MODEL || DEFAULT_MODEL;

  return {
    id: "gemini",
    model,
    async classify(system, input, signal) {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: input }] }],
          // A classification is one line: cap the output hard and keep it deterministic.
          generationConfig: { temperature: 0, maxOutputTokens: 24, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: signal ?? AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`gemini-${res.status}`);
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) throw new Error("gemini-empty");
      return text;
    },
  };
}
