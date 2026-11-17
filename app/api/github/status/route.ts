import { currentUser } from "@/lib/github/auth";
import { githubSetup } from "@/lib/github/config";
import { apiError, json } from "@/lib/github/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const setup = githubSetup();
    const user = setup.ready ? await currentUser() : null;
    return json({ ...setup, user: user ? { id: user.id, login: user.login } : null, installUrl: process.env.GITHUB_APP_SLUG && /^[a-z0-9-]+$/.test(process.env.GITHUB_APP_SLUG) ? `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new` : null, pushPublicKey: setup.pushReady ? process.env.VAPID_PUBLIC_KEY : null });
  } catch (error) { return apiError(error); }
}
