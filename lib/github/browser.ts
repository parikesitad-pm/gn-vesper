import { DEFAULT_PREFERENCES, WATCH_STORAGE_KEY, parseRepository, type Pull, type RepoEvent, type WatchedRepo } from "./types";
import { parsePreferences } from "./preferences";
export type WatchStatus = { ready: boolean; missing: string[]; pushReady: boolean; storage: string; user: { id: number; login: string } | null; installUrl: string | null; pushPublicKey: string | null };
export type Snapshot = { pulls: Pull[]; fetchedAt: string };
export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, signal: init?.signal || AbortSignal.timeout(20000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(`${result.error || "Request failed."}${result.retryAt ? ` Reset: ${new Date(result.retryAt).toLocaleTimeString()}.` : ""}`);
  return result as T;
}
export function readLocalWatch() {
  const empty = { watched: [] as WatchedRepo[], events: [] as RepoEvent[], snapshots: {} as Record<string, Snapshot>, readAt: "", preferences: DEFAULT_PREFERENCES };
  try {
    const saved = JSON.parse(localStorage.getItem(WATCH_STORAGE_KEY) || "null");
    if (!saved) return empty;
    const watched = (Array.isArray(saved.watched) ? saved.watched : []).filter((item: WatchedRepo) => {
      try { return item.repo.private === false && Number.isSafeInteger(item.repo.id) && parseRepository(item.repo.fullName).fullName === item.repo.fullName; } catch { return false; }
    }).slice(0, 3) as WatchedRepo[];
    const allowed = new Set(watched.map(item => item.repo.fullName));
    const events = (Array.isArray(saved.events) ? saved.events : []).filter((event: RepoEvent) => allowed.has(event.repo) && typeof event.id === "string" && typeof event.title === "string" && Number.isFinite(Date.parse(event.at))).slice(0, 100);
    const snapshots: Record<string, Snapshot> = {};
    for (const key of allowed) {
      const value = saved.snapshots?.[key];
      if (value && Array.isArray(value.pulls) && Number.isFinite(Date.parse(value.fetchedAt)) && value.pulls.every((pull: Pull) => pull && Number.isSafeInteger(pull.number) && typeof pull.updatedAt === "string" && typeof pull.title === "string" && typeof pull.url === "string")) snapshots[key] = value;
    }
    let preferences = DEFAULT_PREFERENCES;
    try { preferences = parsePreferences(saved.preferences); } catch { /* Older browser records may not include preferences. */ }
    return { watched, events: events as RepoEvent[], snapshots, readAt: typeof saved.readAt === "string" ? saved.readAt : "", preferences };
  } catch { return empty; }
}
export function changedPulls(repo: string, previous: Snapshot | undefined, pulls: Pull[]): RepoEvent[] {
  if (!previous) return [];
  const known = new Map(previous.pulls.map(pull => [pull.number, pull.updatedAt]));
  return pulls.filter(pull => known.get(pull.number) !== pull.updatedAt).map(pull => ({ id: `${repo}:${pull.number}:${pull.updatedAt}`, repo, title: `PR ${known.has(pull.number) ? "updated" : "opened"} · #${pull.number} ${pull.title}`, url: pull.url, kind: "pull_request", at: new Date().toISOString(), actor: pull.author }));
}
