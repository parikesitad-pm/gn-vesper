import type { Pull, PullDetail, RepoRef, Repository } from "./types";
import { githubUrl } from "./types";

export class GitHubError extends Error {
  constructor(public status: number, message: string, public retryAt?: string) { super(message); }
}
const publicCache = new Map<string, { until: number; value: unknown }>();
export async function github<T>(path: string, token?: string): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid GitHub API path.");
  const cached = !token && publicCache.get(path);
  if (cached && cached.until > Date.now()) return cached.value as T;
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error",
  });
  if (!response.ok) {
    const reset = response.headers.get("x-ratelimit-reset");
    const retryAt = reset ? new Date(Number(reset) * 1000).toISOString() : undefined;
    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0" || response.status === 429) throw new GitHubError(429, "GitHub rate limit reached. Try again after the reset time.", retryAt);
    throw new GitHubError(response.status, response.status === 404 ? "Repository not found or access not granted." : response.status === 401 ? "GitHub authorization expired. Reconnect GitHub." : "GitHub request failed. Check app permissions or retry.");
  }
  const value: T = await response.json();
  if (!token) { if (publicCache.size >= 200) publicCache.delete(publicCache.keys().next().value || ""); publicCache.set(path, { until: Date.now() + 120000, value }); }
  return value;
}
type GHRepo = { id: number; full_name: string; description: string | null; html_url: string; private: boolean; default_branch: string };
type GHPull = { number: number; title: string; html_url: string; state: string; draft?: boolean; user: { login: string } | null; updated_at: string; requested_reviewers?: { login: string }[]; head: { sha: string }; body?: string; additions?: number; deletions?: number; changed_files?: number };
export function repository(repo: GHRepo): Repository {
  const [owner, name] = repo.full_name.split("/");
  return { id: repo.id, fullName: repo.full_name, owner, name, description: repo.description || "", url: githubUrl(repo.html_url), private: repo.private, defaultBranch: repo.default_branch };
}
const pull = (item: GHPull, login?: string): Pull => ({ number: item.number, title: item.title, url: githubUrl(item.html_url), state: item.state, draft: !!item.draft, author: item.user?.login || "unknown", updatedAt: item.updated_at, reviewRequested: !!login && !!item.requested_reviewers?.some(user => user.login === login), headSha: item.head.sha });
export async function getRepository(ref: RepoRef, token?: string) { return repository(await github<GHRepo>(`/repos/${ref.fullName}`, token)); }
export async function getPulls(ref: RepoRef, token?: string, login?: string) {
  const items = await github<GHPull[]>(`/repos/${ref.fullName}/pulls?state=open&sort=updated&direction=desc&per_page=50`, token);
  return items.map(item => pull(item, login));
}
export async function getPullDetail(ref: RepoRef, number: number, token?: string, login?: string): Promise<PullDetail> {
  const item = await github<GHPull>(`/repos/${ref.fullName}/pulls/${number}`, token);
  const [reviews, checks] = await Promise.all([
    github<{ user: { login: string } | null; state: string }[]>(`/repos/${ref.fullName}/pulls/${number}/reviews?per_page=100`, token),
    github<{ check_runs: { name: string; status: string; conclusion: string | null; html_url: string | null }[] }>(`/repos/${ref.fullName}/commits/${item.head.sha}/check-runs?per_page=100`, token),
  ]);
  return { ...pull(item, login), body: (item.body || "").slice(0, 12000), additions: item.additions || 0, deletions: item.deletions || 0, changedFiles: item.changed_files || 0, reviews: reviews.map(review => ({ author: review.user?.login || "unknown", state: review.state })), checks: checks.check_runs.map(check => ({ name: check.name, status: check.status, conclusion: check.conclusion, url: check.html_url ? githubUrl(check.html_url) : null })) };
}
export async function installedRepositories(token: string) {
  const installations: { id: number }[] = [];
  for (let page = 1; page <= 20; page++) {
    const result = await github<{ installations: { id: number }[]; total_count: number }>(`/user/installations?per_page=100&page=${page}`, token);
    installations.push(...result.installations);
    if (installations.length >= result.total_count) break;
  }
  const repos: Repository[] = [];
  for (const installation of installations) {
    for (let page = 1; page <= 20; page++) {
      const result = await github<{ repositories: GHRepo[]; total_count: number }>(`/user/installations/${installation.id}/repositories?per_page=100&page=${page}`, token);
      repos.push(...result.repositories.map(repository));
      if (page * 100 >= result.total_count) break;
    }
  }
  return repos;
}
