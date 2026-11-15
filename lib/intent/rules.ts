/**
 * Deterministic local rules: Vesper's quick ear.
 *
 * Most lines a visitor types are obvious — "make it neon", "switch to indonesian", "go back". A rule answers
 * those with no model call, which is why Demo Mode works with no key at all. Rules are deliberately conservative:
 * when a phrase names an intent but not which one ("change the theme"), they return `ambiguous` rather than
 * guess. A correct "I'm not sure" beats a wrong action.
 *
 * Rules are ordered. The first match wins, and the ordering encodes intent: "cv bahasa indonesia" style
 * collisions cannot happen here, but "go back" must not be read as a navigation and a bare "pause" must not
 * silently toggle motion.
 */
import { looksLikeQuestion } from "./normalize";
import type { VesperAction } from "./types";

export type RuleOutcome =
  | { kind: "action"; intent: VesperAction }
  | { kind: "ambiguous"; reason: string }
  | { kind: "none" };

const has = (s: string, re: RegExp) => re.test(s);

/** Optimal string alignment (Damerau–Levenshtein) distance, capped: a transposed pair counts as one edit. */
function editDistance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prevPrev: number[] | null = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1);
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      // A transposed pair counts as one edit, not two: d(lihgt, light) is 1.
      if (prevPrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prevPrev[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return cap + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** A word appears exactly, or within one edit — enough for a typo, too little to match an unrelated word. */
function hasWord(s: string, word: string, cap = 1): boolean {
  if (word.length < 4) return new RegExp(`\\b${word}\\b`).test(s);
  for (const token of s.split(/[^\p{L}\p{N}]+/u)) {
    if (token.length >= 3 && editDistance(token, word, cap) <= cap) return true;
  }
  return false;
}

type Match<T> = [RegExp, T][];
const pick = <T>(s: string, list: Match<T>): T | undefined => list.find(([re]) => re.test(s))?.[1];

const THEMES: Match<"dark" | "light" | "neon"> = [
  [/\b(dark|gelap|malam)\b/, "dark"],
  [/\b(light|terang|siang)\b/, "light"],
  [/\bneon\b/, "neon"],
];
const LANGS: Match<"en" | "id"> = [
  [/\b(indonesian|indonesia)\b|\bid\b/, "id"],
  [/\b(english|inggris)\b|\ben\b/, "en"],
];
const DESTINATIONS: Match<"playground" | "architecture" | "feedback"> = [
  [/\b(architecture|arsitektur|pipeline)\b/, "architecture"],
  [/\b(feedback|masukan|masukkan|saran|kritik|keluhan)\b/, "feedback"],
  [/\bplayground\b/, "playground"],
];
const BARE_DEST: Record<string, "playground" | "architecture" | "feedback"> = {
  architecture: "architecture",
  arsitektur: "architecture",
  pipeline: "architecture",
  feedback: "feedback",
  playground: "playground",
};

/** A theme named by word or by a one-edit typo ("neonn", "lihgt"). */
const themeOf = (s: string): "dark" | "light" | "neon" | undefined =>
  pick(s, THEMES) ?? (hasWord(s, "neon") ? "neon" : hasWord(s, "dark") ? "dark" : hasWord(s, "light") ? "light" : undefined);

const langOf = (s: string): "en" | "id" | undefined =>
  pick(s, LANGS) ?? (hasWord(s, "indonesian") ? "id" : hasWord(s, "english") ? "en" : undefined);

const themeish = (s: string) => has(s, /\b(theme|themes|tema|warna|colou?rs?|mode|tampilan)\b/);
const langish = (s: string) => has(s, /\b(language|languages|lang|bahasa|locale)\b/);
const motionish = (s: string) => has(s, /\b(motion|animations?|animasi|gerak|transisi)\b/);
const navish = (s: string) => has(s, /\b(go to|show|see|open|jump to|take me to|scroll to|navigate|ke|lihat|buka|tampilkan|pergi)\b/);
const backish = (s: string) => has(s, /\b(go back|previous page|last page|back|kembali|balik|mundur)\b/) || has(s, /halaman (terakhir|sebelumnya)/);
const helpish = (s: string) =>
  /^(help|bantuan|tolong|help me|\?)$/.test(s) || has(s, /\b(what can you do|apa yang bisa kamu lakukan|what can vesper do)\b/);

/**
 * The one local entry point. Returns an action, an explicit ambiguity, or `none` (nothing local matched — the
 * optional AI classifier gets a turn, and in Demo Mode the pipeline falls back to a help state).
 */
export function ruleIntent(normalized: string): RuleOutcome {
  const s = normalized.toLowerCase().trim();
  if (!s) return { kind: "none" };

  // Help is checked before the question test: "what can you do" is a request for the help state, not a handoff.
  if (helpish(s)) return { kind: "action", intent: { action: "help", arg: "" } };

  // A question is a handoff before anything else: "how do I change the theme?" must not switch the theme.
  if (looksLikeQuestion(s)) return { kind: "action", intent: { action: "handoff", arg: "question" } };

  // Back is explicit; a bare "back"/"kembali" is unambiguous here, but "back to work" is not a thing we have.
  if (backish(s)) return { kind: "action", intent: { action: "back", arg: "" } };

  // Motion: a verb and a motion word, or the two stock phrasings. A bare "pause" stays ambiguous.
  const motionVerb = has(s, /\b(pause|stop|freeze|disable|turn off|matikan|hentikan|jeda|resume|play|unpause|enable|turn on|nyalakan|lanjutkan|toggle)\b/);
  if (motionVerb && motionish(s)) return { kind: "action", intent: { action: "motion", arg: "toggle" } };
  if (has(s, /\b(reduce|pause|disable|stop) motion\b/) || /^(motion|animasi)$/.test(s)) return { kind: "action", intent: { action: "motion", arg: "toggle" } };

  // Theme: named, or an explicit ambiguity when the line asks for a theme without naming one.
  const theme = themeOf(s);
  if (theme) return { kind: "action", intent: { action: "theme", arg: theme } };
  if (themeish(s)) return { kind: "ambiguous", reason: "It mentions the theme but not which one (dark, light or neon)." };

  // Language: named, or an explicit ambiguity.
  const lang = langOf(s);
  if (lang) return { kind: "action", intent: { action: "language", arg: lang } };
  if (langish(s)) return { kind: "ambiguous", reason: "It mentions the language but not which one (English or Indonesian)." };

  // Navigation: a destination, with or without a verb ("show the architecture", "arsitektur").
  const dest = pick(s, DESTINATIONS) ?? BARE_DEST[s];
  if (dest && (navish(s) || BARE_DEST[s] !== undefined)) return { kind: "action", intent: { action: "navigate", arg: dest } };

  return { kind: "none" };
}
