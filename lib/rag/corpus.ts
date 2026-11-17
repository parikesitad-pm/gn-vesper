/**
 * Corpus ingestion for creator questions.
 *
 * The public site is the only source of truth. `llms-full.txt` is the text, and `llms.txt` is the map that turns
 * a heading such as `about.md` into a real public URL. Chunks keep that heading and URL, so every answer can
 * point at the page it came from. Long sections are split on sentence boundaries with a small overlap; nothing
 * is rewritten and no profile facts are added here.
 *
 * The corpus is cached in memory for a few hours and fetched once under concurrency. It is server-only.
 */
import { LLMS_FULL_URL, LLMS_URL } from "./sources";

export type Chunk = {
  id: string;
  heading: string;
  url: string;
  text: string;
};

export type Corpus = {
  chunks: Chunk[];
  fetchedAt: number;
  /** The two fixed public endpoints that produced this corpus. */
  endpoints: string[];
};

const TTL_MS = 6 * 60 * 60_000;
const MAX_BYTES = 2 * 1024 * 1024;
const TARGET_CHUNK = 900;
const MIN_CHUNK = 220;

let cache: { corpus: Corpus; expires: number } | null = null;
let inflight: Promise<Corpus> | null = null;

export class CorpusUnavailableError extends Error {
  constructor(readonly endpoint: string, readonly status?: number) {
    super(`source-unavailable: ${endpoint}`);
    this.name = "CorpusUnavailableError";
  }
}

async function fetchPublicText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "text/plain", "user-agent": "VesperNotch/1.0 (+https://d-ap.my.id)" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new CorpusUnavailableError(url);
  }
  if (!res.ok) throw new CorpusUnavailableError(url, res.status);

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new CorpusUnavailableError(url, 413);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new CorpusUnavailableError(url, 413);
  if (!text.trim()) throw new CorpusUnavailableError(url, 204);
  return text;
}

/** `- [about.md](https://d-ap.my.id/about): ...` → `about.md` → URL. */
export function parsePageMap(llmsTxt: string): Map<string, string> {
  const map = new Map<string, string>();
  const link = /\[([^\[\]\r\n]{1,200})\]\((https:\/\/d-ap\.my\.id[^)\s]{0,2048})\)/g;
  for (const match of llmsTxt.matchAll(link)) {
    const label = match[1]?.trim();
    const url = match[2]?.trim();
    if (label && url) map.set(label, url);
  }
  return map;
}

/** The one-line public description from `llms.txt`, used as a page summary in retrieval. */
export function parsePageDescriptions(llmsTxt: string): Map<string, string> {
  const map = new Map<string, string>();
  const line = /^-\s*\[([^\[\]\r\n]{1,200})\]\((https:\/\/d-ap\.my\.id[^)\s]{0,2048})\):\s*(.+)$/gm;
  for (const match of llmsTxt.matchAll(line)) {
    const label = match[1]?.trim();
    const description = match[3]?.trim();
    if (label && description) map.set(label, description);
  }
  return map;
}

function urlFor(heading: string, map: Map<string, string>): string {
  const direct = map.get(heading);
  if (direct) return direct;

  // A heading that is already a public path, e.g. `/jasa-aplikasi-tugas-akhir`.
  if (heading.startsWith("/")) return `https://d-ap.my.id${heading}`;

  // Map a few unpaged headings to their real page; everything else falls back to the full public text.
  const fallback: Record<string, string> = {
    CV: "https://d-ap.my.id/about",
    Profile: "https://d-ap.my.id/about",
    "resume.pdf": "https://d-ap.my.id/resume",
  };
  return fallback[heading] ?? LLMS_FULL_URL;
}

function splitSection(body: string): string[] {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= TARGET_CHUNK) return [clean];

  const sentences = clean.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.length >= MIN_CHUNK || chunks.length === 0) chunks.push(current.trim());
    else if (chunks.length) chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${current}`.trim();
    current = "";
  };

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > TARGET_CHUNK && current) flush();
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current.trim()) flush();

  return chunks;
}

/** Parse the full text into provenance-preserving chunks. Exported so the retrieval tests need no network. */
export function parseCorpus(fullText: string, llmsTxt: string): Chunk[] {
  const map = parsePageMap(llmsTxt);
  const descriptions = parsePageDescriptions(llmsTxt);
  const lines = fullText.split(/\r?\n/);
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } = { heading: "Profile", body: [] };

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      if (current.body.join("").trim()) sections.push(current);
      current = { heading: heading[1]!.trim(), body: [] };
      continue;
    }
    // The document title is not a section body; the intro paragraph under it is useful profile text.
    if (/^#\s+/.test(line)) continue;
    current.body.push(line);
  }
  if (current.body.join("").trim()) sections.push(current);

  const chunks: Chunk[] = [];
  sections.forEach((section, sectionIndex) => {
    const url = urlFor(section.heading, map);
    // The public one-line description is real llms.txt content and a useful summary for retrieval.
    const description = descriptions.get(section.heading);
    const body = [description, section.body.join("\n")].filter(Boolean).join("\n");
    splitSection(body).forEach((text, chunkIndex) => {
      chunks.push({
        id: `${sectionIndex}-${chunkIndex}`,
        heading: section.heading,
        url,
        text,
      });
    });
  });

  return chunks;
}

/** Fetch, parse and cache the public corpus. Concurrent callers share one fetch. */
export async function getCorpus(): Promise<Corpus> {
  if (cache && cache.expires > Date.now()) return cache.corpus;
  if (inflight) return inflight;

  inflight = (async () => {
    const [fullText, llmsTxt] = await Promise.all([fetchPublicText(LLMS_FULL_URL), fetchPublicText(LLMS_URL)]);
    const corpus: Corpus = {
      chunks: parseCorpus(fullText, llmsTxt),
      fetchedAt: Date.now(),
      endpoints: [LLMS_URL, LLMS_FULL_URL],
    };
    if (corpus.chunks.length === 0) throw new CorpusUnavailableError(LLMS_FULL_URL, 204);
    cache = { corpus, expires: Date.now() + TTL_MS };
    return corpus;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Test and operations helper: clears the in-memory corpus without touching the network. */
export function clearCorpusCache(): void {
  cache = null;
  inflight = null;
}
