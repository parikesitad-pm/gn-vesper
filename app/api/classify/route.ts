/**
 * The only server route. It exists so a provider key can live server-side and never reach the browser.
 *
 * It does three things: guard the request, ask the configured provider for one line, and return that line with
 * the measured provider/model/latency. It does not decide what the line means — the reply is a candidate, and
 * the browser-side pipeline validates it against the allow-list exactly as it would a local rule.
 */
import { MAX_INPUT } from "@/lib/intent/normalize";
import { SYSTEM_PROMPT, selectProvider } from "@/lib/providers";

// No caching and no edge runtime: this reads a server-only key and must never be prerendered.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** A tiny in-memory burst limiter: classification is cheap but not free, and this is a public demo. */
const WINDOW_MS = 10 * 60_000;
const LIMIT = 20;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // a crude bound so the map cannot grow without limit
  return recent.length > LIMIT;
}

export async function POST(req: Request) {
  const provider = selectProvider(process.env);
  if (!provider) return json({ error: "ai-disabled" }, 503);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return json({ error: "rate-limited" }, 429);

  let body: { input?: unknown };
  try {
    body = (await req.json()) as { input?: unknown };
  } catch {
    return json({ error: "bad-request" }, 400);
  }

  const input = typeof body.input === "string" ? body.input.slice(0, MAX_INPUT) : "";
  if (input.trim().length < 2) return json({ error: "too-short" }, 400);

  const started = Date.now();
  try {
    const raw = await provider.classify(SYSTEM_PROMPT, input);
    return json({ raw, provider: provider.id, model: provider.model, latencyMs: Date.now() - started });
  } catch (err) {
    // Never leak a key or a stack: the message is a short provider code the UI can show honestly.
    return json({ error: err instanceof Error ? err.message : "provider-error" }, 502);
  }
}
