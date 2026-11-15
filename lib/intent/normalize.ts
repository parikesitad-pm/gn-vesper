/**
 * Normalisation: the one place the visitor's raw text is cleaned before anything else looks at it.
 *
 * Normalising is not sanitising. The text is data for the rest of the pipeline; cleaning it here only removes
 * noise (case, padding, zero-width characters, control characters) so rules and the classifier see the same
 * thing. It never strips a phrase because it "looks like an instruction" — the allow-list, not normalisation,
 * is what stops a line from doing something it should not.
 */

/** Lines are short by design; a 200-character cap keeps a paste from reaching the classifier at all. */
export const MAX_INPUT = 200;

export function normalize(raw: string): string {
  return raw
    .normalize("NFC")
    // Zero-width and bidi-control characters: invisible, so they only ever help smuggle text past a reader.
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, "")
    // Control characters, except a plain space.
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INPUT);
}

/** True when a line carries nothing to act on (empty, or punctuation only). */
export function isBlank(normalized: string): boolean {
  return normalized.replace(/[^\p{L}\p{N}]/gu, "").length === 0;
}

/**
 * Reads as a question rather than a command. English and Indonesian, matched on the first word or a trailing
 * "?" so "how do i go back" hands off while "go back" is a command.
 */
export function looksLikeQuestion(normalized: string): boolean {
  const s = normalized.trim();
  if (/\?\s*$/.test(s)) return true;
  return /^(what|how|who|why|when|where|which|does|do|is|are|can|could|should|would|has|have|tell me|explain|apa|apakah|bagaimana|gimana|siapa|kenapa|mengapa|kapan|dimana|di mana|berapa|bisakah|jelaskan|ceritakan)\b/i.test(
    s,
  );
}
