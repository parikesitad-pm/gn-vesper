/**
 * Deterministic lexical retrieval (BM25). No embeddings, no vector database, no per-keystroke model call.
 *
 * The corpus is small, so a good BM25 index is instant and easy to inspect. English and Indonesian stopwords are
 * removed, and a short alias map connects the words visitors actually use ("created", "skills", "hire", "where")
 * to the vocabulary of the site. Retrieval stays separate from generation: this file only returns chunks.
 */
import type { Chunk } from "./corpus";
import type { RetrievalHit } from "./types";

const K1 = 1.5;
const B = 0.75;
const MIN_SCORE = 0.35;

const STOPWORDS = new Set(
  (
    "the a an and or but of to in on for with about is are was were be been being do does did what who whom which " +
    "when where why how can could should would will you your i me my we our he she it they them their this that " +
    "these those from at as by not no yes have has had s t just please tell show give any some there here " +
    "yang dan atau di ke dari untuk dengan tentang adalah itu ini apa siapa bagaimana gimana kenapa mengapa kapan " +
    "dimana berapa apakah bisa boleh saya aku kamu anda dia mereka kita kami punya ada tidak ya tolong jelaskan " +
    "ceritakan kasih mohon dong kah lah pun " +
    // The handle appears in nearly every public chunk, so it carries no retrieval signal. `dausan` and
    // `parikesit` stay searchable because they are discriminative.
    "dap_ dap"
  ).split(/\s+/),
);

/** Words visitors use → words the public site uses. Each alias adds tokens; it never removes the original. */
const ALIASES: Record<string, string[]> = {
  creator: ["dap_", "about", "profile"],
  created: ["dap_", "built", "about"],
  create: ["built", "about"],
  maker: ["dap_", "creator"],
  author: ["dap_", "creator"],
  pembuat: ["dap_", "creator"],
  pencipta: ["dap_", "creator"],
  dibuat: ["dap_", "built"],
  membuat: ["dap_", "built"],
  dap: ["dap_"],
  dausan: ["dap_"],
  parikesit: ["dap_"],
  skills: ["stack", "frontend", "backend", "tools"],
  skill: ["stack", "frontend", "backend"],
  keahlian: ["skills", "stack", "frontend", "backend", "tools"],
  keterampilan: ["skills", "stack", "frontend", "backend"],
  kemampuan: ["skills", "stack"],
  tech: ["stack", "technology"],
  technologies: ["stack", "technology"],
  tools: ["stack", "tooling"],
  experience: ["career", "work", "changelog"],
  career: ["experience", "work", "changelog"],
  karier: ["experience", "career", "work", "changelog"],
  pengalaman: ["experience", "career", "work", "changelog"],
  pekerjaan: ["experience", "work"],
  job: ["experience", "work"],
  worked: ["experience", "work"],
  projects: ["modula", "case", "build"],
  project: ["modula", "case", "build"],
  proyek: ["projects", "modula", "case", "build"],
  projek: ["projects", "modula", "case", "build"],
  portfolio: ["modula", "projects"],
  services: ["service", "jasa", "build"],
  service: ["jasa", "build"],
  jasa: ["services", "service", "build"],
  hire: ["services", "contact"],
  contact: ["email", "whatsapp", "reach"],
  kontak: ["contact", "email", "whatsapp"],
  hubungi: ["contact", "whatsapp"],
  reach: ["contact", "email"],
  email: ["contact", "halo"],
  whatsapp: ["contact"],
  location: ["based", "jakarta"],
  based: ["location", "jakarta"],
  live: ["jakarta", "indonesia"],
  tinggal: ["location", "jakarta", "indonesia"],
  tinggalnya: ["location", "jakarta", "indonesia"],
  domisili: ["location", "jakarta", "indonesia"],
  lokasi: ["location", "jakarta", "indonesia"],
  education: ["university", "computer", "science"],
  degree: ["education", "bachelor", "university", "computer", "science"],
  pendidikan: ["education", "university", "computer", "science"],
  kuliah: ["education", "university", "computer", "science"],
  universitas: ["university", "education"],
  school: ["university", "education"],
  cv: ["resume", "experience"],
  resume: ["cv", "experience"],
  github: ["contact", "code"],
  linkedin: ["contact", "profile"],
  freelancer: ["freelance", "services"],
  ai: ["llm", "gemini", "groq"],
  llm: ["ai", "gemini", "groq"],
};

export type Index = {
  chunks: Chunk[];
  tokens: string[][];
  df: Map<string, number>;
  idf: Map<string, number>;
  avgdl: number;
};

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/\p{L}[\p{L}\p{N}_-]*/gu) ?? []).filter(
    (token) => token.length > 1 && !STOPWORDS.has(token),
  );
}

function expand(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const token of tokens) {
    out.add(token);
    for (const alias of ALIASES[token] ?? []) if (!STOPWORDS.has(alias)) out.add(alias);
  }
  return [...out];
}

export function buildIndex(chunks: Chunk[]): Index {
  const tokens = chunks.map((chunk) => tokenize(`${chunk.heading} ${chunk.text}`));
  const df = new Map<string, number>();
  let total = 0;

  for (const doc of tokens) {
    total += doc.length;
    for (const token of new Set(doc)) df.set(token, (df.get(token) ?? 0) + 1);
  }

  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log(1 + (chunks.length - count + 0.5) / (count + 0.5)));
  }

  return { chunks, tokens, df, idf, avgdl: tokens.length ? total / tokens.length : 0 };
}

/** Rank chunks for one question. Returns at most `limit` hits above the score floor. */
export function search(index: Index, query: string, limit = 4): RetrievalHit[] {
  const terms = expand(tokenize(query));
  if (terms.length === 0) return [];

  const hits: RetrievalHit[] = [];

  index.chunks.forEach((chunk, i) => {
    const doc = index.tokens[i]!;
    const dl = doc.length || 1;
    let score = 0;

    for (const term of terms) {
      const idf = index.idf.get(term);
      if (!idf) continue;
      const tf = doc.filter((token) => token === term).length;
      if (tf === 0) continue;
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * dl) / index.avgdl)));
    }

    // A heading match is a strong signal for short factual questions.
    const headingTokens = new Set(tokenize(chunk.heading));
    if (terms.some((term) => headingTokens.has(term))) score *= 1.2;

    if (score > MIN_SCORE) {
      hits.push({ id: chunk.id, heading: chunk.heading, url: chunk.url, text: chunk.text, score });
    }
  });

  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
