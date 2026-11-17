import { currentUser } from "@/lib/github/auth";
import { installedRepositories } from "@/lib/github/api";
import { watchStore } from "@/lib/github/store";
import { apiError, bodyJson, json, sameOrigin, throttle } from "@/lib/github/http";
import { eventMatches } from "@/lib/github/preferences";
import { DEFAULT_PREFERENCES, type RepoEvent, type WatchPreferences, type WatchedRepo } from "@/lib/github/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (throttle(request)) return json({ error: "Please wait before refreshing." }, 429);
  try {
    const user = await currentUser();
    if (!user) return json({ error: "Connect GitHub first." }, 401);
    const store = watchStore();
    const [watched, preferences, readAt, available] = await Promise.all([
      store.get<WatchedRepo[]>(`watch:${user.id}`), store.get<WatchPreferences>(`preferences:${user.id}`), store.get<string>(`read:${user.id}`), installedRepositories(user.token),
    ]);
    const accessible = new Set(available.map(repo => repo.id));
    const lists = await Promise.all((watched || []).filter(item => accessible.has(item.repo.id)).map(async item => (await store.entries<RepoEvent>(`event:${item.repo.fullName.toLowerCase()}:`)).filter(row => row.value.at >= item.addedAt).map(row => row.value)));
    const events = lists.flat().filter(event => eventMatches(event, preferences || DEFAULT_PREFERENCES, user.login) && Date.parse(event.at) > Date.now() - 30 * 86400000).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
    return json({ events, readAt: readAt || "", syncedAt: new Date().toISOString() });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origin not allowed." }, 403);
  try {
    const user = await currentUser();
    if (!user) return json({ error: "Connect GitHub first." }, 401);
    const input = await bodyJson(request);
    const time = typeof input.readAt === "string" ? Date.parse(input.readAt) : NaN;
    if (!Number.isFinite(time) || time > Date.now() + 1000) return json({ error: "Invalid read time." }, 400);
    const store = watchStore();
    const previous = await store.get<string>(`read:${user.id}`);
    const readAt = new Date(Math.max(time, previous ? Date.parse(previous) : 0)).toISOString();
    await store.put(`read:${user.id}`, readAt);
    return json({ readAt });
  } catch (error) { return apiError(error); }
}
