/**
 * The KNOW server route. Read-only retrieval over d-ap.my.id, then a grounded answer.
 *
 * Everything private stays here: the corpus cache, provider keys and provider calls. The browser receives a
 * concise answer, public source links, the provider/model that wrote it, measured latency, and the attempt
 * history. It never receives a local path, a key, a raw corpus dump or a provider stack trace.
 */
import { MAX_INPUT } from "@/lib/intent/normalize";
import { answerQuestion, KnowledgeUnavailableError } from "@/lib/rag/answer";
import { CorpusUnavailableError } from "@/lib/rag/corpus";
import { limited } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited("ask", ip, 20)) return json({ error: "rate-limited" }, 429);

  let body: { question?: unknown };
  try {
    body = (await req.json()) as { question?: unknown };
  } catch {
    return json({ error: "bad-request" }, 400);
  }

  const question = typeof body.question === "string" ? body.question.slice(0, MAX_INPUT) : "";
  if (question.trim().length < 3) return json({ error: "too-short" }, 400);

  try {
    return json(await answerQuestion(question, process.env));
  } catch (err) {
    if (err instanceof CorpusUnavailableError) {
      return json({ error: "source-unavailable", endpoint: err.endpoint }, 503);
    }
    if (err instanceof KnowledgeUnavailableError) {
      return json({ error: err.message, attempts: err.attempts }, err.status);
    }
    return json({ error: err instanceof Error ? err.message.slice(0, 80) : "answer-failed" }, 502);
  }
}
