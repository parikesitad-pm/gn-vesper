import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt, hash } from "./security";
import { github, GitHubError } from "./api";
import { watchStore } from "./store";
import { appOrigin } from "./config";
import type { User } from "./types";

type StoredUser = { id: number; login: string; encrypted: string; expiresAt?: number };
export type Session = { userId: number; expiresAt: number };
export async function exchangeToken(fields: Record<string, string>) {
  const response = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, ...fields }), cache: "no-store", signal: AbortSignal.timeout(12000) });
  const result = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !result.access_token || result.error) throw new GitHubError(response.status >= 500 ? 503 : 401, "GitHub authorization failed. Please reconnect.");
  return { token: result.access_token, refreshToken: result.refresh_token, expiresAt: result.expires_in ? Date.now() + result.expires_in * 1000 : undefined };
}
export async function saveUser(user: User) {
  await watchStore().put(`user:${user.id}`, { id: user.id, login: user.login, expiresAt: user.expiresAt, encrypted: encrypt(JSON.stringify({ token: user.token, refreshToken: user.refreshToken })) } satisfies StoredUser);
}
const refreshing = new Map<number, Promise<User | null>>();
export async function loadUser(id: number): Promise<User | null> {
  const saved = await watchStore().get<StoredUser>(`user:${id}`);
  if (!saved) return null;
  const tokens = JSON.parse(decrypt(saved.encrypted)) as { token: string; refreshToken?: string };
  if (saved.expiresAt && saved.expiresAt < Date.now() + 60000) {
    if (!tokens.refreshToken) return null;
    let refresh = refreshing.get(id);
    if (!refresh) {
      refresh = (async () => {
        try {
          const renewed = await exchangeToken({ grant_type: "refresh_token", refresh_token: tokens.refreshToken! });
          const user = { id, login: saved.login, ...renewed }; await saveUser(user); return user;
        } catch (error) {
          if (error instanceof GitHubError && error.status === 401) { await watchStore().remove(`user:${id}`); return null; }
          throw error;
        }
      })().finally(() => refreshing.delete(id));
      refreshing.set(id, refresh);
    }
    return refresh;
  }
  return { id, login: saved.login, ...tokens, expiresAt: saved.expiresAt };
}
export async function currentUser(): Promise<User | null> {
  const sessionId = (await cookies()).get("vesper_session")?.value;
  if (!sessionId || !process.env.TOKEN_ENCRYPTION_KEY) return null;
  const key = `session:${hash(sessionId)}`;
  const session = await watchStore().get<Session>(key);
  if (!session) return null;
  if (session.expiresAt < Date.now()) { await watchStore().remove(key); return null; }
  return loadUser(session.userId);
}
export async function createSession(tokens: { token: string; refreshToken?: string; expiresAt?: number }) {
  const identity = await github<{ id: number; login: string }>("/user", tokens.token);
  const user: User = { ...identity, ...tokens };
  await saveUser(user);
  const sessionId = randomBytes(32).toString("base64url");
  await watchStore().put(`session:${hash(sessionId)}`, { userId: user.id, expiresAt: Date.now() + 30 * 86400000 } satisfies Session);
  (await cookies()).set("vesper_session", sessionId, { httpOnly: true, secure: appOrigin().startsWith("https:"), sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  return user;
}
