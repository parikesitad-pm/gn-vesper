import { currentUser } from "@/lib/github/auth";
import { watchStore } from "@/lib/github/store";
import { parseSubscription } from "@/lib/github/push";
import { hash } from "@/lib/github/security";
import { githubSetup } from "@/lib/github/config";
import { apiError, bodyJson, json, sameOrigin, throttle } from "@/lib/github/http";
async function subscription(request: Request, remove: boolean) {
  if (!sameOrigin(request)) return json({ error: "Origin not allowed." }, 403);
  if (throttle(request)) return json({ error: "Too many requests." }, 429);
  try {
    const user = await currentUser();
    if (!user) return json({ error: "Connect GitHub first." }, 401);
    if (!remove && !githubSetup().pushReady) return json({ error: "Web Push is not configured." }, 503);
    let value;
    try { value = parseSubscription(await bodyJson(request)); } catch { return json({ error: "Invalid push subscription." }, 400); }
    const store = watchStore();
    const key = `push:${user.id}:${hash(value.endpoint)}`;
    if (remove) await store.remove(key);
    else {
      const current = await store.entries(`push:${user.id}:`);
      if (current.length >= 10 && !current.some(row => row.key === key)) return json({ error: "Too many notification devices." }, 400);
      await store.put(key, value);
    }
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
export const POST = (request: Request) => subscription(request, false);
export const DELETE = (request: Request) => subscription(request, true);
