/**
 * Browser-side creator knowledge client. The corpus fetch, retrieval and provider calls all happen in
 * `/api/ask`; this file only carries the question and returns the grounded result.
 */
import type { ProviderAttempt } from "@/lib/providers/types";
import type { KnowledgeAnswer } from "@/lib/rag/types";

export class KnowledgeClientError extends Error {
  constructor(
    message: string,
    readonly attempts: ProviderAttempt[] = [],
    readonly status = 0,
  ) {
    super(message);
    this.name = "KnowledgeClientError";
  }
}

export async function askVesper(question: string, signal?: AbortSignal): Promise<KnowledgeAnswer> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; attempts?: ProviderAttempt[] };
    throw new KnowledgeClientError(body.error ?? `ask-${res.status}`, body.attempts ?? [], res.status);
  }

  const body = (await res.json()) as Partial<KnowledgeAnswer>;
  if (typeof body.answer !== "string" || !Array.isArray(body.sources)) {
    throw new KnowledgeClientError("ask-malformed", [], res.status);
  }
  return {
    answer: body.answer,
    sources: body.sources.filter(
      (s): s is { title: string; url: string } =>
        !!s && typeof s.title === "string" && typeof s.url === "string" && s.url.startsWith("https://d-ap.my.id"),
    ),
    provider: body.provider ?? "unknown",
    model: body.model ?? "unknown",
    latencyMs: typeof body.latencyMs === "number" ? body.latencyMs : 0,
    attempts: Array.isArray(body.attempts) ? body.attempts : [],
    retrieval: Array.isArray(body.retrieval) ? body.retrieval : [],
    mode: body.mode ?? "grounded",
  };
}
