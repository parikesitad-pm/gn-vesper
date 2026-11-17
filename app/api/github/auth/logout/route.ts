import { cookies } from "next/headers";
import { hash } from "@/lib/github/security";
import { watchStore } from "@/lib/github/store";
import type { Session } from "@/lib/github/auth";
import { bodyJson, json, sameOrigin, apiError } from "@/lib/github/http";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origin not allowed." }, 403);
  try {
    const input = await bodyJson(request);
    const jar = await cookies();
    const session = jar.get("vesper_session")?.value;
    const stored = session ? await watchStore().get<Session>(`session:${hash(session)}`) : null;
    const user = stored && stored.expiresAt > Date.now() ? { id: stored.userId } : null;
    if (user && typeof input.pushEndpoint === "string") await watchStore().remove(`push:${user.id}:${hash(input.pushEndpoint)}`);
    if (user && input.forget === true) {
      const store = watchStore();
      const rows = await store.entries<unknown>("");
      for (const row of rows) {
        if (row.key === `user:${user.id}` || ["watch", "preferences", "read"].some(prefix => row.key === `${prefix}:${user.id}`) || row.key.startsWith(`push:${user.id}:`) || row.key.startsWith("session:") && (row.value as { userId: number }).userId === user.id) await store.remove(row.key);
      }
    }
    if (session) await watchStore().remove(`session:${hash(session)}`);
    jar.delete("vesper_session");
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
