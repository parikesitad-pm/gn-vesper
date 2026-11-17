import type { WatchStore } from "./store";
import { DEFAULT_PREFERENCES, githubUrl, type RepoEvent, type WatchedRepo, type WatchPreferences } from "./types";
import { eventMatches } from "./preferences";

type Payload = {
  action?: string; sender?: { login?: string; id?: number }; repository?: { full_name?: string; id?: number };
  pull_request?: { number: number; title: string; html_url: string; merged?: boolean; user?: { login?: string } };
  requested_reviewer?: { login?: string };
  check_run?: { name: string; conclusion?: string; html_url?: string; completed_at?: string };
  release?: { name?: string; tag_name?: string; html_url: string };
};
export function normalizeEvent(kind: string, value: unknown, delivery: string, now = new Date().toISOString()): RepoEvent | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Payload;
  const repo = data.repository?.full_name;
  if (!repo || !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return null;
  const base = { id: delivery, repo, at: now, actor: data.sender?.login || "github" };
  if (kind === "pull_request" && data.pull_request) {
    const pr = data.pull_request;
    if (data.action === "review_requested") return { ...base, kind: "review_requested", title: `Review requested · #${pr.number} ${pr.title}`, url: githubUrl(pr.html_url), recipient: data.requested_reviewer?.login };
    if (!["opened", "reopened", "closed", "ready_for_review", "synchronize"].includes(data.action || "")) return null;
    return { ...base, kind: "pull_request", title: `PR ${pr.merged ? "merged" : data.action} · #${pr.number} ${pr.title}`, url: githubUrl(pr.html_url), recipient: pr.user?.login };
  }
  if (kind === "check_run" && data.action === "completed" && data.check_run && ["failure", "timed_out", "action_required", "startup_failure"].includes(data.check_run.conclusion || "")) return { ...base, kind: "check_failed", title: `Check failed · ${data.check_run.name}`, url: githubUrl(data.check_run.html_url) };
  if (kind === "release" && data.action === "published" && data.release) return { ...base, kind: "release", title: `Release · ${data.release.name || data.release.tag_name}`, url: githubUrl(data.release.html_url) };
  return null;
}

export async function acceptEvent(store: WatchStore, event: RepoEvent, notify: (userId: number, event: RepoEvent) => Promise<void>) {
  if (!await store.once(`event:${event.repo.toLowerCase()}:${event.id}`, event)) return false;
  const watchers = await store.entries<WatchedRepo[]>("watch:");
  await Promise.allSettled(watchers.filter(row => row.value.some(watched => watched.repo.fullName.toLowerCase() === event.repo.toLowerCase())).map(async row => {
    const userId = Number(row.key.slice(6));
    const user = await store.get<{ login: string }>(`user:${userId}`);
    const preferences = await store.get<WatchPreferences>(`preferences:${userId}`) || DEFAULT_PREFERENCES;
    if (user && preferences.mode !== "digest" && preferences.browserNotifications && eventMatches(event, preferences, user.login)) await notify(userId, event);
  }));
  const expired = await store.entries<RepoEvent>(`event:${event.repo.toLowerCase()}:`);
  const keep = expired.sort((a, b) => b.value.at.localeCompare(a.value.at)).slice(0, 200);
  const keepKeys = new Set(keep.filter(row => Date.parse(row.value.at) > Date.now() - 30 * 86400000).map(row => row.key));
  await Promise.all(expired.filter(row => !keepKeys.has(row.key)).map(row => store.remove(row.key)));
  return true;
}
