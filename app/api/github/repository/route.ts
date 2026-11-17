import { getPullDetail, getPulls, getRepository } from "@/lib/github/api";
import { currentUser } from "@/lib/github/auth";
import { apiError, json, throttle } from "@/lib/github/http";
import { parseRepository } from "@/lib/github/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (throttle(request)) return json({ error: "Too many requests. Please wait." }, 429);
  const url = new URL(request.url);
  let ref;
  try { ref = parseRepository(url.searchParams.get("repo") || ""); } catch { return json({ error: "Enter a GitHub repository URL or owner/repository." }, 400); }
  const number = url.searchParams.get("pull");
  if (number && !/^[1-9]\d{0,8}$/.test(number)) return json({ error: "Invalid pull request number." }, 400);
  try {
    const user = await currentUser();
    if (number) return json({ pull: await getPullDetail(ref, Number(number), user?.token, user?.login), fetchedAt: new Date().toISOString() });
    const [repo, pulls] = await Promise.all([getRepository(ref, user?.token), getPulls(ref, user?.token, user?.login)]);
    return json({ repo, pulls, limit: 50, fetchedAt: new Date().toISOString() });
  } catch (error) { return apiError(error); }
}
