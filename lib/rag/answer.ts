/**
 * Creator knowledge: identity fast path, retrieval, grounding and honest failure.
 *
 * The answer is always one of four things:
 * - a deterministic identity fact ("I'm Vesper, created by dap_…"), so the one fact that must never be
 *   hallucinated is not left to a model;
 * - a model answer built only from retrieved public chunks, with their page URLs;
 * - an extractive answer from the best chunk when no model is configured (Demo Mode);
 * - an honest "not on record" that links the full public source.
 *
 * A provider outage is not papered over: if a model was configured and every provider failed, this throws a
 * typed error carrying the measured attempts, and the route shows the oops path.
 */
import { identityIntent, OWL, VESPER, type IdentityKind } from "../identity";
import { answerChain, ProviderChainError, runChain } from "../providers";
import type { Env, Provider, ProviderAttempt } from "../providers/types";
import { buildIndex, search, type Index } from "./bm25";
import { getCorpus, type Corpus } from "./corpus";
import { ANSWER_SYSTEM_PROMPT, buildAnswerInput } from "./prompt";
import { ABOUT_SOURCE, CREATOR, CREATOR_SITE_SOURCE, FULL_TEXT_SOURCE, LLMS_FULL_URL } from "./sources";
import type { KnowledgeAnswer, RetrievalHit, Source } from "./types";

export class KnowledgeUnavailableError extends Error {
  constructor(
    message: string,
    readonly attempts: ProviderAttempt[] = [],
    readonly status = 502,
  ) {
    super(message);
    this.name = "KnowledgeUnavailableError";
  }
}

const isIndonesian = (s: string): boolean =>
  /\b(siapa|apa|beda(?:nya)?|perbedaan(?:nya)?|bagaimana|gimana|kenapa|mengapa|kapan|dimana|di mana|berapa|apakah|bisa|bisakah|tolong|jelaskan|ceritakan|jasa|pekerjaan|pengalaman|keahlian|proyek|projek|kontak|hubungi|tinggal|tinggalnya|dimana)\b/i.test(
    s,
  );

const VESPER_IDENTITY: Record<IdentityKind, { en: string; id: string }> = {
  self: {
    en: `I'm ${VESPER.name} (${VESPER.id}), ${VESPER.role}. I understand intent and run safe interface actions for ${CREATOR.handle}.`,
    id: `Saya ${VESPER.name} (${VESPER.id}), living notch dan antarmuka bahasa alami. Saya memahami intent dan menjalankan aksi antarmuka yang aman untuk ${CREATOR.handle}.`,
  },
  creator: {
    en: `I'm ${VESPER.name} (${VESPER.id}), created by ${CREATOR.handle} — ${CREATOR.name}. The creator's verified site is ${CREATOR.label}.`,
    id: `Saya ${VESPER.name} (${VESPER.id}), dibuat oleh ${CREATOR.handle} — ${CREATOR.name}. Situs resmi pembuat saya: ${CREATOR.label}.`,
  },
  "is-creator": {
    en: `No — ${CREATOR.handle} (${CREATOR.name}) is the human creator. I'm ${VESPER.name} (${VESPER.id}), the interface he built.`,
    id: `Bukan — ${CREATOR.handle} (${CREATOR.name}) adalah manusia pembuatnya. Saya ${VESPER.name} (${VESPER.id}), antarmuka yang ia buat.`,
  },
  "compare-owl": {
    en: `${VESPER.name} (${VESPER.id}) turns a single command into a validated interface action, or answers a creator question with public sources. ${OWL.name} (${OWL.id}) is a separate assistant for multi-turn conversation and deeper technical help. Both were created by ${CREATOR.handle}. Vesper has no conversation memory or live Owl connection.`,
    id: `${VESPER.name} (${VESPER.id}) mengubah satu perintah menjadi aksi antarmuka yang tervalidasi, atau menjawab pertanyaan pembuat dengan sumber publik. ${OWL.name} (${OWL.id}) adalah asisten terpisah untuk percakapan berkelanjutan dan bantuan teknis yang lebih dalam. Keduanya dibuat oleh ${CREATOR.handle}. Vesper tidak menyimpan riwayat percakapan dan tidak terhubung langsung ke Owl.`,
  },
  "is-owl": {
    en: `No. I'm ${VESPER.name} (${VESPER.id}), the living notch and natural-language interface. ${OWL.name} (${OWL.id}) is a separate conversational assistant created by ${CREATOR.handle}.`,
    id: `Bukan. Saya ${VESPER.name} (${VESPER.id}), living notch dan antarmuka bahasa alami. ${OWL.name} (${OWL.id}) adalah asisten percakapan terpisah yang dibuat oleh ${CREATOR.handle}.`,
  },
  "about-owl": {
    en: `${OWL.name} (${OWL.id}) is a separate conversational assistant created by ${CREATOR.handle} for multi-turn discussion and deeper technical help. I'm ${VESPER.name} (${VESPER.id}), the notch interface for intent and safe actions. This showcase has no live Owl integration; ${CREATOR.handle}'s work is at ${CREATOR.label}.`,
    id: `${OWL.name} (${OWL.id}) adalah asisten percakapan terpisah yang dibuat oleh ${CREATOR.handle} untuk diskusi multi-turn dan bantuan teknis yang lebih dalam. Saya ${VESPER.name} (${VESPER.id}), antarmuka notch untuk intent dan aksi aman. Showcase ini tidak punya integrasi Owl langsung; karya ${CREATOR.handle} ada di ${CREATOR.label}.`,
  },
  provider: {
    en: `Gemini and Groq are model providers I can use internally; they are not my identity. I'm ${VESPER.name} (${VESPER.id}), created by ${CREATOR.handle}.`,
    id: `Gemini dan Groq adalah penyedia model yang bisa saya pakai secara internal; mereka bukan identitas saya. Saya ${VESPER.name} (${VESPER.id}), dibuat oleh ${CREATOR.handle}.`,
  },
  "replace-owl": {
    en: `No. ${OWL.name} (${OWL.id}) handles deeper, multi-turn conversation and technical help. I'm ${VESPER.name} (${VESPER.id}), built for intent and safe interface actions. They are separate roles, not replacements.`,
    id: `Tidak. ${OWL.name} (${OWL.id}) menangani percakapan multi-turn dan bantuan teknis yang lebih dalam. Saya ${VESPER.name} (${VESPER.id}), dibuat untuk intent dan aksi antarmuka yang aman. Perannya terpisah, bukan pengganti.`,
  },
  "meet-owl": {
    en: `${OWL.name} (${OWL.id}) is a separate assistant created by ${CREATOR.handle}. This showcase has no live Owl integration or private endpoint to share; the verified place to find ${CREATOR.handle}'s work is ${CREATOR.label}.`,
    id: `${OWL.name} (${OWL.id}) adalah asisten terpisah yang dibuat oleh ${CREATOR.handle}. Showcase ini tidak punya integrasi Owl langsung atau endpoint privat untuk dibagikan; tempat resmi untuk menemukan karya ${CREATOR.handle} adalah ${CREATOR.label}.`,
  },
};

/**
 * The deterministic entity layer. Identity questions never reach retrieval or a provider: the facts that must
 * never be wrong (who created Vesper, whether Vesper is Owl or dap_, what a provider is) are answered here.
 * Other creator questions still go through grounded retrieval.
 */
export function identityAnswer(question: string): KnowledgeAnswer | null {
  const kind = identityIntent(question);
  if (!kind) return null;

  const id = isIndonesian(question);
  const text = VESPER_IDENTITY[kind];
  return {
    answer: id ? text.id : text.en,
    // A creator question links the public profile too; every other identity answer links the verified site.
    sources: kind === "creator" ? [CREATOR_SITE_SOURCE, ABOUT_SOURCE] : [CREATOR_SITE_SOURCE],
    provider: "local",
    model: "identity",
    latencyMs: 0,
    attempts: [],
    retrieval: [],
    mode: "identity",
  };
}

const uniqueSources = (hits: RetrievalHit[]): Source[] => {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const hit of hits) {
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    out.push({ title: hit.heading, url: hit.url });
  }
  return out;
};

const retrievalInfo = (hits: RetrievalHit[]) =>
  hits.map((hit) => ({ heading: hit.heading, url: hit.url, score: Math.round(hit.score * 100) / 100 }));

/** Demo Mode: quote the best public chunk instead of pretending a model wrote an answer. */
export function extractiveAnswer(question: string, hits: RetrievalHit[], attempts: ProviderAttempt[] = []): KnowledgeAnswer {
  const top = hits[0]!;
  const sentences = top.text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) ?? [top.text];
  let excerpt = sentences.slice(0, 3).join(" ").trim();
  if (excerpt.length > 420) excerpt = `${excerpt.slice(0, 417).trimEnd()}…`;

  return {
    answer: `${excerpt} [1]`,
    sources: uniqueSources(hits.slice(0, 2)),
    provider: "local",
    model: "extractive",
    latencyMs: 0,
    attempts,
    retrieval: retrievalInfo(hits),
    mode: "extractive",
  };
}

function unsupportedAnswer(question: string): KnowledgeAnswer {
  const id = isIndonesian(question);
  return {
    answer: id
      ? "Itu tidak ada di situs publik dap_, jadi saya tidak menebak. Profil publik lengkapnya ada di tautan di bawah."
      : "That is not on record in dap_'s public site, so I won't guess. The full public profile is linked below.",
    sources: [FULL_TEXT_SOURCE],
    provider: "local",
    model: "none",
    latencyMs: 0,
    attempts: [],
    retrieval: [],
    mode: "unsupported",
  };
}

/** Models write grouped citations ("[1, 3]", "[1-3]"); expand them so no cited page drops out of `sources`. */
function expandCitations(text: string): string {
  return text.replace(/\[(\d+(?:\s*[,–—-]\s*\d+)*)\]/g, (_whole, group: string) => {
    const numbers: number[] = [];
    for (const part of group.split(/\s*,\s*/)) {
      const range = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(part.trim());
      if (range) {
        const first = Number(range[1]);
        const last = Number(range[2]);
        // Bounded so a malformed giant range cannot inflate the answer.
        if (first <= last && last - first <= 20) {
          for (let n = first; n <= last; n += 1) numbers.push(n);
        }
        continue;
      }
      if (/^\d+$/.test(part.trim())) numbers.push(Number(part.trim()));
    }
    return numbers.map((n) => `[${n}]`).join(" ");
  });
}

/** Keep a model reply within the observable contract: plain text, valid citations only, bounded length. */
export function sanitizeAnswer(text: string, hitCount: number): string {
  const normalized = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*#>]/g, "")
    .replace(/^\s*answer\s*:\s*/i, "")
    .replace(/\s+/g, " ");

  let clean = expandCitations(normalized)
    .replace(/\[(\d+)\]/g, (whole, n: string) => {
      const index = Number(n);
      return index >= 1 && index <= hitCount ? whole : "";
    })
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

  if (clean.length > 1200) {
    const cut = clean.slice(0, 1200);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    clean = `${(end > 300 ? cut.slice(0, end + 1) : cut).trimEnd()}…`;
  }
  return clean;
}

export type AnswerDeps = {
  corpus?: Corpus;
  index?: Index;
  hits?: RetrievalHit[];
  chain?: Provider[];
};

/**
 * Answer one creator question. `hits`/`chain` are injectable so tests never touch the network or a provider.
 */
export async function answerQuestion(question: string, env: Env, deps: AnswerDeps = {}): Promise<KnowledgeAnswer> {
  const identity = identityAnswer(question);
  if (identity) return identity;

  let hits = deps.hits;
  if (!hits) {
    const corpus = deps.corpus ?? (await getCorpus());
    const index = deps.index ?? buildIndex(corpus.chunks);
    hits = search(index, question, 4);
  }

  if (hits.length === 0) return unsupportedAnswer(question);

  const chain = deps.chain ?? answerChain(env);
  // No model configured: Demo Mode still answers, but it quotes the public source instead of synthesising.
  if (chain.length === 0) return extractiveAnswer(question, hits);

  let reply;
  try {
    reply = await runChain(chain, ANSWER_SYSTEM_PROMPT, buildAnswerInput(question, hits), {
      maxOutputTokens: 280,
      timeoutMs: 12_000,
    });
  } catch (err) {
    if (err instanceof ProviderChainError) {
      throw new KnowledgeUnavailableError("answer-providers-failed", err.attempts);
    }
    throw new KnowledgeUnavailableError("answer-failed");
  }

  const answer = sanitizeAnswer(reply.text, hits.length);
  if (!answer) throw new KnowledgeUnavailableError("answer-empty", reply.attempts);

  const notOnRecord = /not on record|tidak ada di (situs|catatan)/i.test(answer);

  // Cite what the answer actually used. A retrieved-but-uncited chunk is not presented as a source.
  const citedNumbers = [...answer.matchAll(/\[(\d+)\]/g)]
    .map((match) => Number(match[1]))
    .filter((n) => n >= 1 && n <= hits.length);
  const citedHits = [...new Set(citedNumbers)].map((n) => hits[n - 1]!);

  return {
    answer,
    sources: notOnRecord ? [FULL_TEXT_SOURCE] : uniqueSources(citedHits.length > 0 ? citedHits : hits),
    provider: reply.provider,
    model: reply.model,
    latencyMs: reply.latencyMs,
    attempts: reply.attempts,
    retrieval: retrievalInfo(hits),
    mode: notOnRecord ? "unsupported" : "grounded",
  };
}

/** Used by the route to report a safe, source-based failure without leaking a provider body. */
export const SOURCE_FALLBACK_URL = LLMS_FULL_URL;
