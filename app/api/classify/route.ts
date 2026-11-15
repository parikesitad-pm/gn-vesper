/**
 * The ACT server route. It exists so provider keys stay server-side and never reach the browser.
 *
 * It guards the request, runs the classification chain (Groq first, Gemini as the fallback), and returns the
 * winning provider's one line plus every attempt it measured. It does not decide what the line means — the
 * browser-side pipeline validates the reply against the allow-list exactly as it would a local rule.
 */
import { MAX_INPUT } from "@/lib/intent/normalize";
import { classifyChain, ProviderChainError, runChain, SYSTEM_PROMPT } from "@/lib/providers";
import { limited } from "@/lib/server/rate-limit";

// No caching and no edge runtime: this reads server-only keys and must never be prerendered.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  const chain = classifyChain(process.env);
  if (chain.length === 0) return json({ error: "ai-disabled" }, 503);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited("classify", ip, 20)) return json({ error: "rate-limited" }, 429);

  let body: { input?: unknown };
  try {
    body = (await req.json()) as { input?: unknown };
  } catch {
    return json({ error: "bad-request" }, 400);
  }

  const input = typeof body.input === "string" ? body.input.slice(0, MAX_INPUT) : "";
  if (input.trim().length < 2) return json({ error: "too-short" }, 400);

  try {
    const reply = await runChain(chain, SYSTEM_PROMPT, input, { maxOutputTokens: 48, timeoutMs: 8000 });
    return json({
      raw: reply.text,
      provider: reply.provider,
      model: reply.model,
      latencyMs: reply.latencyMs,
      attempts: reply.attempts,
    });
  } catch (err) {
    // Never leak a key or a stack: a short provider code is enough for the UI to be honest.
    if (err instanceof ProviderChainError) return json({ error: err.message, attempts: err.attempts }, 502);
    return json({ error: err instanceof Error ? err.message.slice(0, 80) : "provider-error" }, 502);
  }
}
