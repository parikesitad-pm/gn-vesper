import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { appOrigin, githubSetup } from "@/lib/github/config";
import { signState } from "@/lib/github/security";
import { json, throttle } from "@/lib/github/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!githubSetup().ready) return json({ error: "GitHub App is not configured. See /docs/github.", missing: githubSetup().missing }, 503);
  if (throttle(request, "github-auth")) return json({ error: "Please wait before reconnecting." }, 429);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  (await cookies()).set("vesper_oauth", `${state}.${verifier}.${signState(`${state}.${verifier}`)}`, { httpOnly: true, secure: appOrigin().startsWith("https:"), sameSite: "lax", maxAge: 600, path: "/api/github/auth" });
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID!, redirect_uri: `${appOrigin()}/api/github/auth/callback`, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return Response.redirect(url, 302);
}
