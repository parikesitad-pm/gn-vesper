import { currentUser } from "@/lib/github/auth";
import { watchStore } from "@/lib/github/store";
import { apiError, bodyJson, json, sameOrigin } from "@/lib/github/http";
import { parsePreferences } from "@/lib/github/preferences";
import { DEFAULT_PREFERENCES, type WatchPreferences } from "@/lib/github/types";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const user = await currentUser(); if (!user) return json({ error: "Connect GitHub first." }, 401); return json({ preferences: await watchStore().get<WatchPreferences>(`preferences:${user.id}`) || DEFAULT_PREFERENCES }); } catch (error) { return apiError(error); }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origin not allowed." }, 403);
  let preferences;
  try { preferences = parsePreferences(await bodyJson(request)); } catch { return json({ error: "Invalid notification preferences." }, 400); }
  try { const user = await currentUser(); if (!user) return json({ error: "Connect GitHub first." }, 401); await watchStore().put(`preferences:${user.id}`, preferences); return json({ preferences }); } catch (error) { return apiError(error); }
}
