/**
 * Validation: the gate between "some text that looks like an intent" and "an action Vesper may take".
 *
 * A classifier — local rule, model, or a visitor pasting a reply — only ever produces a candidate. This file
 * turns that candidate into an intent or rejects it, and the allow-list in `types.ts` is the only authority.
 * Nothing here interprets the text; it compares two short strings against a fixed map.
 */
import { ACTION_ARGS, type ActionName, type RawIntent, type Validation, type VesperAction } from "./types";

/** Splits a one-line reply into an action and its argument. Everything after the first word is the argument. */
export function parseRaw(reply: string): RawIntent {
  const line = (reply.trim().split("\n")[0] ?? "").trim();
  // Strip the wrapping a model likes to add (backticks, quotes, a trailing full stop) but keep the words.
  const cleaned = line.replace(/[`"'“”‘’]/g, "").replace(/\.$/, "");
  const [action = "", ...rest] = cleaned.split(/\s+/);
  return { action: action.toLowerCase(), arg: rest.join(" ").trim().toLowerCase() };
}

/**
 * The allow-list check. Unknown action names and out-of-range arguments are rejected with a reason, never
 * coerced to the nearest match: coercing is how a classifier's mistake becomes an action nobody asked for.
 */
export function validate(raw: RawIntent): Validation {
  const args = ACTION_ARGS[raw.action as ActionName];
  if (!args) return { ok: false, reason: `Unknown action "${raw.action}".`, raw };
  if (!(args as readonly string[]).includes(raw.arg)) {
    return { ok: false, reason: `"${raw.action}" does not accept the argument "${raw.arg}".`, raw };
  }
  return { ok: true, intent: { action: raw.action, arg: raw.arg } as VesperAction };
}

/** Parse then validate a one-line reply. */
export function readIntent(reply: string): Validation {
  return validate(parseRaw(reply));
}
