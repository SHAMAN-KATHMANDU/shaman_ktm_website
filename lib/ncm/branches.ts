// In-memory cache of NCM branches with 24h TTL. Fetches on-demand when empty
// or expired; falls back to returning empty on error (stale-on-error — better
// than breaking the admin UI on a transient API outage).

import { getNcmClient, type BranchInfo } from "@/lib/ncm/client";

interface CacheEntry {
  branches: BranchInfo[];
  expiresAt: number;
}

let cache: CacheEntry | null = null;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedBranches(): Promise<BranchInfo[]> {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return cache.branches;
  }

  try {
    const client = getNcmClient();
    const branches = await client.getBranches();
    cache = {
      branches,
      expiresAt: now + CACHE_TTL_MS,
    };
    return branches;
  } catch (err) {
    // Return cached data if available, even if expired (stale-on-error)
    if (cache) {
      return cache.branches;
    }
    // No cache available; propagate the error so the caller can decide
    throw err;
  }
}

export function invalidateCache(): void {
  cache = null;
}
