import { cookies } from "next/headers";
import { createSession, exchangeToken } from "@/lib/github/auth";
import { appOrigin } from "@/lib/github/config";
import { signState } from "@/lib/github/security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const [state, verifier, signature] = (jar.get("vesper_oauth")?.value || "").split(".");
  jar.delete({ name: "vesper_oauth", path: "/api/github/auth" });
  if (!state || !verifier || signature !== signState(`${state}.${verifier}`) || url.searchParams.get("state") !== state || !url.searchParams.get("code")) return Response.redirect(`${appOrigin()}/vesper?auth=invalid-state`, 302);
  try {
    const tokens = await exchangeToken({ code: url.searchParams.get("code")!, code_verifier: verifier, redirect_uri: `${appOrigin()}/api/github/auth/callback` });
    await createSession(tokens);
    return Response.redirect(`${appOrigin()}/vesper?auth=connected`, 302);
  } catch { return Response.redirect(`${appOrigin()}/vesper?auth=failed`, 302); }
}
