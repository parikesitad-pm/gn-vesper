/**
 * Canonical entity identity for the showcase.
 *
 * Vesper (GN-013) and Owl (GN-011) are two distinct entities created by dap_. They are never modes of one
 * another, and a model provider is never an identity. This module holds the facts and the deterministic
 * classifier that recognises identity questions; `lib/rag/answer.ts` turns the result into prose before any
 * retrieval or provider call.
 *
 * Routing and answering share this one function on purpose. If `lib/intent/rules.ts` decides a line is an
 * identity question, the answer layer must agree; splitting the patterns would let them drift.
 */
import { normalize } from "./intent/normalize";
import { CREATOR } from "./rag/sources";

export { CREATOR };

export const VESPER = {
  id: "GN-013",
  name: "Vesper",
  role: "the living notch and natural-language interface",
} as const;

export const OWL = {
  id: "GN-011",
  name: "Owl",
  role: "a separate conversational assistant",
} as const;

export type IdentityKind =
  | "self"
  | "creator"
  | "is-creator"
  | "is-owl"
  | "about-owl"
  | "compare-owl"
  | "provider"
  | "replace-owl"
  | "meet-owl";

const has = (s: string, re: RegExp) => re.test(s);

const OWL_WORD = /\bowl\b/;
const VESPER_WORD = /\b(vesper|notch)\b/;
const PROVIDER_NAME = /\b(gemini|groq|openai|mistral)\b/;
const PROVIDER_WORD = /\b(provider|providers|model|models|llm)\b/;
const CREATION_WORD = /\b(create[ds]?|created|creating|made|make|built|build|author(?:ed)?|pembuat|pencipta|dibuat|membuat|menciptakan)\b/;

const asksCompareOwl = (s: string) =>
  has(s, OWL_WORD) &&
  has(s, /\b(differences?|different|compare|comparison|versus|vs|beda(?:nya)?|berbeda|perbedaan(?:nya)?|banding(?:kan)?|dibanding(?:kan)?)\b/) &&
  (has(s, /\b(you|your|vesper|notch|kamu|kau|lu|lo|elu|dia|ini)\b/) ||
    /^(?:apa\s+)?(?:beda(?:nya)?|perbedaan(?:nya)?)\s+(?:sama|dengan)\s+owl[?!.]*$/.test(s));

/** "Can you replace Owl?" — a comparison, not a capability claim. */
const asksReplaceOwl = (s: string) =>
  has(s, OWL_WORD) && has(s, /\b(replace|replaces|replacement|instead of|better than|take over|gantikan|menggantikan|pengganti|lebih baik)\b/);

/** "Where can I meet Owl?" — asks for an Owl channel we do not have. Never invent one. */
const asksMeetOwl = (s: string) =>
  has(s, OWL_WORD) && has(s, /\b(meet|find|contact|reach|talk|chat|visit|where|how|dimana|di mana|gimana|bagaimana|ketemu|temui|hubungi)\b/);

/** "Who is Owl?" / "What is Owl?" / "Who created Owl?" — an identity question about Owl. */
const asksAboutOwl = (s: string) =>
  has(s, OWL_WORD) &&
  (has(s, /\b(who is|who'?s|what is|what'?s|tell me about|explain|describe|siapa|apa itu|tentang|jelaskan|ceritakan)\s+(?:the\s+)?owl\b|\bowl\s+(?:itu\s+)?(?:apa|siapa)\b/) ||
    has(s, /\b(created|made|built|creator|maker|author|pembuat|pencipta)\b/));

/** "Are you Owl?" / "Apakah kamu Owl?" — a direct claim to be Owl. */
const asksIfOwl = (s: string) =>
  has(s, /\b(are|is)\s+(you|this|vesper)\b[^.?!]*\bowl\b/) || has(s, /\b(apakah|kamu|ini)\b[^.?!]*\bowl\b/);

/** "Are you dap_?" — a claim to be the human creator. */
const asksIsCreator = (s: string) =>
  has(
    s,
    /\b(are you|apakah kamu)\s+(the\s+|a\s+|an\s+)?(human\s+|real\s+|actual\s+)?(dap_?|dausan|parikesit|creator|pembuat|human|manusia)\b/,
  ) || has(s, /^(kamu|kau)\s+(dap_?|dausan|parikesit|manusia)\b/);

/** "Which AI provider are you?" — provider/model distinction, never identity. */
const asksProvider = (s: string) =>
  (has(s, PROVIDER_NAME) && has(s, /\b(are you|is this|you use|do you use|kamu|pakai|vesper)\b/)) ||
  (has(s, PROVIDER_WORD) &&
    has(s, /\b(are you|you use|do you use|which|what|kamu|pakai)\b/) &&
    has(s, /\b(you|your|kamu|vesper)\b/));

/** "Who created you?" / "Who is your creator?" — the one fact that must never be hallucinated. */
const asksCreator = (s: string) =>
  has(s, /\b(who|siapa)\b[^.?!]*\b(created|made|built|creates|membuat|menciptakan|dibuat)\b[^.?!]*\b(you|vesper|kamu)\b/) ||
  has(s, /\b(who|siapa)\b[^.?!]*\b(creator|maker|pembuat(?:mu|nya)?|pencipta(?:mu|nya)?)\b/) ||
  has(s, /\b(your|vesper'?s?)\s+(creator|maker|author|pembuat(?:mu)?|pencipta(?:mu)?)\b/) ||
  (has(s, VESPER_WORD) && has(s, CREATION_WORD) && has(s, /\b(who|siapa|creator|pembuat|pencipta)\b/));

/** "Who are you?" / "What is Vesper?" / "Are you an AI?" — Vesper's own identity. */
const asksSelf = (s: string) =>
  has(s, /\b(who|what)\s+(are|is)\s+(you|vesper|this)\b/) ||
  has(s, /\b(are|is)\s+(you|this)\s+vesper\b/) ||
  has(s, /\b(who|what)\s+is\s+vesper\b/) ||
  has(s, /\b(tell me about (you|vesper)|about yourself|introduce yourself|your name)\b/) ||
  has(s, /\b(siapa|apa|apa itu)\s+(kamu|vesper|ini)\b/) ||
  has(s, /\b(kamu siapa|perkenalkan diri|tentang (kamu|vesper))\b/) ||
  has(s, /\b(are you|apakah kamu)\b[^.?!]*\b(ai|bot|assistant|asisten|robot)\b/);

/**
 * Recognise an identity/entity question, deterministically. `null` means this is not an identity question and
 * normal retrieval or handling applies.
 *
 * Order matters: a question about Owl's creator is about Owl, not about Vesper's creator; and a direct "are you
 * Owl?" is a distinction, not a request for Owl's address.
 */
export function identityIntent(question: string): IdentityKind | null {
  const s = normalize(question).toLowerCase();
  if (!s) return null;

  if (asksCompareOwl(s)) return "compare-owl";
  if (asksReplaceOwl(s)) return "replace-owl";
  if (asksMeetOwl(s)) return "meet-owl";
  if (asksAboutOwl(s)) return "about-owl";
  if (asksIfOwl(s)) return "is-owl";
  if (asksIsCreator(s)) return "is-creator";
  if (asksProvider(s)) return "provider";
  if (asksCreator(s)) return "creator";
  if (asksSelf(s)) return "self";
  return null;
}
