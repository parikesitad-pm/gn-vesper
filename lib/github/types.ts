export type RepoRef = { owner: string; name: string; fullName: string };
export type Repository = RepoRef & { id: number; description: string; url: string; private: boolean; defaultBranch: string };
export type Pull = { number: number; title: string; url: string; state: string; draft: boolean; author: string; updatedAt: string; reviewRequested: boolean; headSha: string };
export type PullDetail = Pull & { body: string; additions: number; deletions: number; changedFiles: number; reviews: { author: string; state: string }[]; checks: { name: string; status: string; conclusion: string | null; url: string | null }[] };
export type RepoEvent = { id: string; repo: string; title: string; url: string; kind: "pull_request" | "review_requested" | "check_failed" | "release"; at: string; actor: string; recipient?: string };
export type WatchPreferences = { mode: "all" | "mine" | "digest"; kinds: RepoEvent["kind"][]; browserNotifications: boolean };
export type WatchedRepo = { repo: Repository; addedAt: string };
export type User = { id: number; login: string; token: string; refreshToken?: string; expiresAt?: number };
export const DEFAULT_PREFERENCES: WatchPreferences = { mode: "all", kinds: ["pull_request", "review_requested", "check_failed", "release"], browserNotifications: false };
export const LOCAL_WATCH_EVENT = "vesper:repositories";
export const WATCH_STORAGE_KEY = "vesper-repositories-v1";

export function parseRepository(input: string): RepoRef {
  let path = input.trim();
  if (path.startsWith("github.com/")) path = `https://${path}`;
  if (path.includes("://")) {
    const url = new URL(path);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port) throw new Error("Use a github.com repository URL.");
    path = url.pathname;
  }
  path = path.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/, "");
  const parts = path.split("/");
  if (parts.length !== 2 || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(parts[0]) || !/^[A-Za-z0-9_.-]{1,100}$/.test(parts[1]) || parts[1] === "." || parts[1] === "..") throw new Error("Enter owner/repository or its GitHub URL.");
  return { owner: parts[0], name: parts[1], fullName: `${parts[0]}/${parts[1]}` };
}

export function githubUrl(value: unknown): string {
  if (typeof value !== "string") return "https://github.com";
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password ? url.href : "https://github.com"; } catch { return "https://github.com"; }
}
