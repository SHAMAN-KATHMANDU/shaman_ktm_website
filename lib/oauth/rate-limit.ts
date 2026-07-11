// Minimal fixed-window in-memory rate limiter for the anonymous OAuth
// endpoints (/register, /token, consent decisions). In-memory is fine here:
// the app runs as a single container, and the state protects against brute
// force, not accounting — losing it on restart is acceptable.

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

// Behind the deploy nginx x-forwarded-for is always set; x-real-ip covers
// other proxies. Direct no-proxy connections all share the "direct" bucket —
// acceptable, since that shape only occurs in local dev.
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "direct"
  );
}
