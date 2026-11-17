import { GitHubError } from "./api";
import { appOrigin } from "./config";
import { limited } from "@/lib/server/rate-limit";
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function sameOrigin(request: Request) { return request.headers.get("origin") === appOrigin(); }
export function throttle(request: Request, bucket = "github") { return limited(bucket, request.headers.get("x-forwarded-for")?.split(",")[0] || "local", 120); }
export function apiError(error: unknown) {
  if (error instanceof GitHubError) return json({ error: error.message, retryAt: error.retryAt }, error.status);
  if (error instanceof Error && error.name === "TimeoutError") return json({ error: "GitHub timed out. Please retry." }, 504);
  return json({ error: "Request failed. Check server configuration or try again." }, 503);
}
export async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > 16384) throw new Error("Request too large.");
  const raw = await request.text();
  if (raw.length > 16384) throw new Error("Request too large.");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}
