// Paging helper for the search index.
//
// The public list endpoints hard-clamp `limit` server-side — products at 100
// (app/api/public/v1/products/route.ts) and blog posts at 50
// (app/api/public/v1/blog/posts/route.ts). Asking for a larger limit is
// silently truncated rather than rejected, so a single call can never index a
// catalogue bigger than the clamp. Search has to page through instead.
export const PRODUCT_PAGE_SIZE = 100;
export const POST_PAGE_SIZE = 50;

// Safety valve. The index is rebuilt on every request (the app is
// force-dynamic at the root layout), so bound the fan-out rather than letting
// a growing catalogue silently multiply the number of round trips. At the
// page sizes above this is 2,000 products / 1,000 posts. If the catalogue ever
// approaches that, the client-side index is the wrong design and search should
// move server-side — the /products endpoint already accepts a `search` param
// that filters in Postgres.
export const MAX_PAGES = 20;

/**
 * Fetch every page of a clamped list endpoint and concatenate the results.
 *
 * Page 1 is awaited on its own because only a response carries `total`; the
 * remaining pages then go out concurrently, so the cost is two waves of
 * latency however many pages there are — not one wave per page.
 */
export async function fetchAllPages<R extends { total: number }, T>(
  fetchPage: (page: number) => Promise<R>,
  pick: (res: R) => T[],
  pageSize: number,
): Promise<T[]> {
  const first = await fetchPage(1);
  const neededPages = Math.ceil(first.total / pageSize) || 1;
  const pageCount = Math.min(MAX_PAGES, neededPages);
  if (pageCount < neededPages) {
    // Never truncate silently — a silent cap is the exact bug this helper
    // exists to fix, and at this size the client-side index has outgrown its
    // design. Say so in the server log rather than quietly indexing a slice.
    console.warn(
      `[search] index truncated at ${pageCount * pageSize} of ${first.total} ` +
        `rows (MAX_PAGES=${MAX_PAGES}). Search no longer covers the full ` +
        `catalogue — move search server-side.`,
    );
  }
  if (pageCount <= 1) return pick(first);
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) => fetchPage(i + 2)),
  );
  return [...pick(first), ...rest.flatMap(pick)];
}
