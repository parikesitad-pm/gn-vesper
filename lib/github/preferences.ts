import { DEFAULT_PREFERENCES, type RepoEvent, type WatchPreferences } from "./types";
export function parsePreferences(value: unknown): WatchPreferences {
  if (!value || typeof value !== "object") throw new Error("Invalid preferences.");
  const input = value as Record<string, unknown>;
  if (!["all", "mine", "digest"].includes(String(input.mode)) || !Array.isArray(input.kinds) || input.kinds.some(kind => !DEFAULT_PREFERENCES.kinds.includes(kind as RepoEvent["kind"])) || typeof input.browserNotifications !== "boolean") throw new Error("Invalid preferences.");
  return { mode: input.mode as WatchPreferences["mode"], kinds: [...new Set(input.kinds)] as RepoEvent["kind"][], browserNotifications: input.browserNotifications };
}
export function eventMatches(event: RepoEvent, preferences: WatchPreferences, login: string) {
  return preferences.kinds.includes(event.kind) && (preferences.mode !== "mine" || event.actor.toLowerCase() === login.toLowerCase() || event.recipient?.toLowerCase() === login.toLowerCase());
}
