import { loadUser } from "./auth";
import { github } from "./api";
import * as webpush from "web-push";
import type { PushSubscription } from "web-push";
import type { RepoEvent } from "./types";
import type { WatchStore } from "./store";
import { githubSetup } from "./config";

export function parseSubscription(value: unknown): PushSubscription {
  if (!value || typeof value !== "object") throw new Error("Invalid subscription.");
  const subscription = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof subscription.endpoint !== "string" || typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys.auth !== "string") throw new Error("Invalid subscription.");
  const url = new URL(subscription.endpoint);
  const hosts = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "notify.windows.com"];
  if (url.protocol !== "https:" || url.port || url.username || url.password || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error("Unsupported push service.");
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(subscription.keys.p256dh) || !/^[A-Za-z0-9_-]{20,30}$/.test(subscription.keys.auth)) throw new Error("Invalid subscription keys.");
  return { endpoint: url.href, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } };
}
export async function sendPush(store: WatchStore, userId: number, event: RepoEvent) {
  if (!githubSetup().pushReady) return;
  const user = await loadUser(userId);
  if (!user) return;
  try { await github(`/repos/${event.repo}`, user.token); } catch { return; }
  const rows = await store.entries<PushSubscription>(`push:${userId}:`);
  await Promise.allSettled(rows.slice(0, 10).map(async row => {
    try {
      await webpush.sendNotification(row.value, JSON.stringify({ title: `Vesper · ${event.repo}`, body: event.title, tag: event.id, url: "/vesper" }), {
        TTL: 3600, timeout: 5000,
        vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
      });
    } catch (error) { if (error instanceof webpush.WebPushError && [404, 410].includes(error.statusCode)) await store.remove(row.key); }
  }));
}
