// Minimal fixed-window in-memory rate limiter for the anonymous OAuth
// endpoints (/register, /token, consent decisions). In-memory is fine here:
// the app runs as a single container, and the state protects against brute
// force, not accounting — losing it on restart is acceptable.

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // Re-insert so Map order stays oldest-first, then evict the oldest in O(1)
    // instead of scanning the whole map on every request once it is full.
    // shortcut: a flood of 10k fresh keys can evict a live bucket early; move
    // to a shared store (Redis) if that ever matters.
    buckets.delete(key);
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

// Production nginx overwrites X-Real-IP and X-Forwarded-For with the client
// address it resolved from CF-Connecting-IP (deploy/prod/nginx.conf), so the
// headers can't be forged from outside. x-real-ip wins; otherwise only the LAST
// X-Forwarded-For hop is trusted — that one was appended by our own proxy,
// while earlier entries are whatever the client sent. Direct no-proxy
// connections all share the "direct" bucket (local dev only).
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "direct"
  );
}
