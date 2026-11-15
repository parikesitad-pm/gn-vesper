/**
 * A tiny in-memory burst limiter shared by the two public routes. It is adequate for a public demo, not a
 * distributed production limit: it resets when the process restarts and is per-instance.
 *
 * Buckets are separate so a visitor spending classification calls does not also lose the creator-answer route.
 */
type Bucket = { hits: Map<string, number[]> };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export function limited(
  bucketName: string,
  ip: string,
  limit: number,
  windowMs = 10 * 60_000,
): boolean {
  let bucket = buckets.get(bucketName);
  if (!bucket) {
    bucket = { hits: new Map() };
    buckets.set(bucketName, bucket);
  }

  const now = Date.now();
  const recent = (bucket.hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  bucket.hits.set(ip, recent);

  if (bucket.hits.size > MAX_KEYS) bucket.hits.clear();
  return recent.length > limit;
}
