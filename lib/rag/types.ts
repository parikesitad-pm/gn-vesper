/**
 * Shared knowledge types. They are safe to import from both the server route and the client: no source code,
 * provider keys or server-only APIs live here.
 */
import type { ProviderAttempt } from "../providers/types";

export type Source = { title: string; url: string };

export type RetrievalHit = {
  id: string;
  /** The public page heading the chunk came from, e.g. `about.md`. */
  heading: string;
  url: string;
  text: string;
  score: number;
};

export type RetrievalInfo = { heading: string; url: string; score: number };

/**
 * `identity` is a deterministic fact; `grounded` is a model answer built only from retrieved chunks;
 * `extractive` is the no-key/no-model fallback that quotes the best public chunk; `unsupported` means the
 * public source does not contain an answer and Vesper says so instead of guessing.
 */
export type KnowledgeMode = "identity" | "grounded" | "extractive" | "unsupported";

export type KnowledgeAnswer = {
  answer: string;
  sources: Source[];
  /** `local` for deterministic answers; otherwise the provider id that wrote the answer. */
  provider: string;
  model: string;
  latencyMs: number;
  attempts: ProviderAttempt[];
  retrieval: RetrievalInfo[];
  mode: KnowledgeMode;
};
