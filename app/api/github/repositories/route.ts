import { installedRepositories, getRepository } from "@/lib/github/api";
import { currentUser } from "@/lib/github/auth";
import { apiError, bodyJson, json, sameOrigin, throttle } from "@/lib/github/http";
import { watchStore } from "@/lib/github/store";
import { parseRepository, type WatchedRepo } from "@/lib/github/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (throttle(request)) return json({ error: "Please wait before refreshing." }, 429);
  try {
    const user = await currentUser();
    if (!user) return json({ error: "Connect GitHub first." }, 401);
    const store = watchStore();
    const saved = await store.get<WatchedRepo[]>(`watch:${user.id}`) || [];
    const available = await installedRepositories(user.token);
    const accessible = new Set(available.map(repo => repo.id));
    const watched = saved.filter(item => accessible.has(item.repo.id));
    if (saved.length !== watched.length) await store.put(`watch:${user.id}`, watched);
    return json({ watched, available });
  } catch (error) { return apiError(error); }
}
async function mutate(request: Request, remove: boolean) {
  if (!sameOrigin(request)) return json({ error: "Origin not allowed." }, 403);
  if (throttle(request)) return json({ error: "Too many requests." }, 429);
  try {
    const user = await currentUser();
    if (!user) return json({ error: "Connect GitHub first." }, 401);
    const input = await bodyJson(request);
    let ref;
    try { ref = parseRepository(String(input.repo || "")); } catch { return json({ error: "Invalid repository." }, 400); }
    const store = watchStore();
    const watched = await store.get<WatchedRepo[]>(`watch:${user.id}`) || [];
    const next = watched.filter(item => item.repo.fullName.toLowerCase() !== ref.fullName.toLowerCase());
    if (!remove) {
      if (next.length >= 20) return json({ error: "You can watch up to 20 repositories." }, 400);
      const available = await installedRepositories(user.token);
      if (!available.some(repo => repo.fullName.toLowerCase() === ref.fullName.toLowerCase())) return json({ error: "Install the GitHub App on this repository first." }, 403);
      next.push({ repo: await getRepository(ref, user.token), addedAt: new Date().toISOString() });
    }
    await store.put(`watch:${user.id}`, next);
    return json({ watched: next });
  } catch (error) { return apiError(error); }
}
export const POST = (request: Request) => mutate(request, false);
export const DELETE = (request: Request) => mutate(request, true);
