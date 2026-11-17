import { verifyWebhook } from "@/lib/github/security";
import { normalizeEvent, acceptEvent } from "@/lib/github/events";
import { sendPush } from "@/lib/github/push";
import { watchStore } from "@/lib/github/store";
import { json } from "@/lib/github/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!process.env.GITHUB_WEBHOOK_SECRET) return json({ error: "Webhook is not configured." }, 503);
  if (Number(request.headers.get("content-length")) > 2_000_000) return json({ error: "Payload too large." }, 413);
  const body = await request.text();
  if (body.length > 2_000_000) return json({ error: "Payload too large." }, 413);
  if (!verifyWebhook(body, request.headers.get("x-hub-signature-256"))) return json({ error: "Invalid webhook signature." }, 401);
  const delivery = request.headers.get("x-github-delivery") || "";
  if (!/^[A-Za-z0-9-]{8,100}$/.test(delivery)) return json({ error: "Missing delivery identifier." }, 400);
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return json({ error: "Invalid JSON." }, 400); }
  const kind = request.headers.get("x-github-event") || "";
  if (kind === "ping") return json({ ok: true, event: "ping" });
  try {
    const store = watchStore();
    if (kind === "github_app_authorization" && payload && typeof payload === "object") {
      const data = payload as { action?: string; sender?: { id?: number } };
      if (data.action === "revoked" && Number.isSafeInteger(data.sender?.id)) await store.remove(`user:${data.sender!.id}`);
      return json({ ok: true });
    }
    const event = normalizeEvent(kind, payload, delivery);
    if (!event) return json({ ok: true, ignored: true });
    const accepted = await acceptEvent(store, event, (id, item) => sendPush(store, id, item));
    return json({ ok: true, duplicate: !accepted });
  } catch { return json({ error: "Event could not be stored. GitHub may redeliver it." }, 503); }
}
