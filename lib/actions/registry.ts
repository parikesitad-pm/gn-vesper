/**
 * The action adapters: the only code in the app that changes anything.
 *
 * Every adapter is a one-line handler for one allow-listed action, and every one of them touches only this
 * showcase's own state. There is no file, shell, network, URL or account access anywhere in this file — that is
 * the whole point of the allow-list. Adding an action means adding an entry here and in `ACTION_ARGS`; nothing
 * else in the pipeline needs to change.
 */
import type { ActionName, Destination, Language, Theme, VesperAction } from "../intent/types";

/** What the page hands the adapters. The notch owns none of this state; the playground does. */
export type ActionContext = {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  /** Flips reduced-motion for the showcase. Returns the new state, so the result line can be accurate. */
  toggleMotion: () => boolean;
  navigate: (destination: Destination) => void;
  /** Returns to the previous section, or false when there is nowhere to go back to. */
  back: () => boolean;
  /** Opens the help/clarify state. */
  help: () => void;
  /** Shows the handoff state for a question. */
  handoff: () => void;
};

/** What an adapter reports back. `key` is localised by the UI; the adapter never builds prose. */
export type Execution = {
  adapter: ActionName;
  key: string;
  arg: string;
  ok: boolean;
};

const ADAPTERS: { [K in ActionName]: (intent: Extract<VesperAction, { action: K }>, ctx: ActionContext) => Execution } = {
  theme: (intent, ctx) => {
    ctx.setTheme(intent.arg);
    return { adapter: "theme", key: "theme", arg: intent.arg, ok: true };
  },
  language: (intent, ctx) => {
    ctx.setLanguage(intent.arg);
    return { adapter: "language", key: "language", arg: intent.arg, ok: true };
  },
  motion: (intent, ctx) => {
    const on = ctx.toggleMotion();
    return { adapter: "motion", key: on ? "motion.on" : "motion.off", arg: intent.arg, ok: true };
  },
  navigate: (intent, ctx) => {
    ctx.navigate(intent.arg);
    return { adapter: "navigate", key: "navigate", arg: intent.arg, ok: true };
  },
  back: (_intent, ctx) => {
    const went = ctx.back();
    if (!went) return { adapter: "back", key: "back.none", arg: "", ok: false };
    return { adapter: "back", key: "back", arg: "", ok: true };
  },
  help: (_intent, ctx) => {
    ctx.help();
    return { adapter: "help", key: "help", arg: "", ok: true };
  },
  handoff: (_intent, ctx) => {
    ctx.handoff();
    return { adapter: "handoff", key: "handoff", arg: "", ok: true };
  },
};

/**
 * Runs one validated intent. The intent has already passed the allow-list, but the adapter is looked up through
 * the same map, so an action with no adapter simply does nothing instead of throwing.
 */
export function execute(intent: VesperAction, ctx: ActionContext): Execution {
  const adapter = ADAPTERS[intent.action] as ((i: VesperAction, c: ActionContext) => Execution) | undefined;
  if (!adapter) return { adapter: intent.action, key: "error", arg: "", ok: false };
  return adapter(intent, ctx);
}
