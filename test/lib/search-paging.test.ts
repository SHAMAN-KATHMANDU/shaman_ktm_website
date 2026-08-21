import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  MAX_PAGES,
  POST_PAGE_SIZE,
  PRODUCT_PAGE_SIZE,
  fetchAllPages,
} from "@/app/search/paging";

/**
 * Regression guard for "search does not show all products".
 *
 * Cause: app/search/page.tsx asked the public API for `limit: 100`, but the
 * catalogue holds 295 published products and the API clamps `limit` to 100
 * server-side — so search silently indexed 100 of 295 (33.9%) and 195
 * products could not be found by name at all. Raising the number alone does
 * nothing; the clamp eats it. The page has to walk the pages.
 */

interface Page {
  total: number;
  items: number[];
}

/** Fake endpoint that enforces the same server-side clamp as the real one. */
function makeEndpoint(total: number, clamp: number) {
  const calls: number[] = [];
  const fetchPage = async (page: number): Promise<Page> => {
    calls.push(page);
    const start = (page - 1) * clamp;
    return {
      total,
      items: Array.from(
        { length: Math.max(0, Math.min(clamp, total - start)) },
        (_, i) => start + i,
      ),
    };
  };
  return { calls, fetchPage };
}

const pick = (p: Page) => p.items;

describe("fetchAllPages", () => {
  it("covers a catalogue larger than the server-side clamp", async () => {
    const { calls, fetchPage } = makeEndpoint(295, 100);
    const items = await fetchAllPages(fetchPage, pick, 100);

    expect(items).toHaveLength(295);
    expect(new Set(items).size).toBe(295); // no duplicates, no gaps
    expect(items[0]).toBe(0);
    expect(items[294]).toBe(294);
    expect(calls.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("makes exactly one request when everything fits on one page", async () => {
    const { calls, fetchPage } = makeEndpoint(2, 50);
    const items = await fetchAllPages(fetchPage, pick, 50);

    expect(items).toHaveLength(2);
    expect(calls).toEqual([1]);
  });

  it("makes exactly one request when the total lands on the page size", async () => {
    const { calls, fetchPage } = makeEndpoint(100, 100);
    const items = await fetchAllPages(fetchPage, pick, 100);

    expect(items).toHaveLength(100);
    expect(calls).toEqual([1]);
  });

  it("handles an empty catalogue without a second request", async () => {
    const { calls, fetchPage } = makeEndpoint(0, 100);
    const items = await fetchAllPages(fetchPage, pick, 100);

    expect(items).toEqual([]);
    expect(calls).toEqual([1]);
  });

  it("stops at MAX_PAGES rather than fanning out without bound", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { calls, fetchPage } = makeEndpoint(100_000, 100);
      const items = await fetchAllPages(fetchPage, pick, 100);

      expect(calls).toHaveLength(MAX_PAGES);
      expect(items).toHaveLength(MAX_PAGES * 100);
      // The cap must never be silent — that is the bug being fixed.
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain("truncated");
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn when it covers everything", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { fetchPage } = makeEndpoint(295, 100);
      await fetchAllPages(fetchPage, pick, 100);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("fetches the pages after the first concurrently, not serially", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchPage = async (page: number): Promise<Page> => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return { total: 295, items: [page] };
    };
    await fetchAllPages(fetchPage, pick, 100);

    // Page 1 is awaited alone (it carries `total`); pages 2..N overlap.
    expect(peak).toBe(2);
  });
});

describe("search page wiring", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/page.tsx"),
    "utf8",
  );

  it("does not fetch the catalogue with a single un-paged call", () => {
    expect(source).not.toMatch(/listProducts\(\s*\{\s*limit:\s*\d+\s*\}\s*\)/);
    expect(source).not.toMatch(/listBlogPosts\(\s*\{\s*limit:\s*\d+\s*\}\s*\)/);
  });

  it("pages both lists through fetchAllPages", () => {
    expect(source).toContain("fetchAllPages");
    expect(source).toContain("PRODUCT_PAGE_SIZE");
    expect(source).toContain("POST_PAGE_SIZE");
  });

  it("asks for no more than the endpoints actually return", () => {
    // A page size above the server clamp would be silently truncated, and the
    // page arithmetic would then skip rows.
    expect(PRODUCT_PAGE_SIZE).toBeLessThanOrEqual(100);
    expect(POST_PAGE_SIZE).toBeLessThanOrEqual(50);
  });
});

describe("public API clamps the page sizes are derived from", () => {
  const read = (p: string) =>
    readFileSync(path.join(process.cwd(), p), "utf8");

  it("products clamps limit at PRODUCT_PAGE_SIZE", () => {
    expect(read("app/api/public/v1/products/route.ts")).toContain(
      `Math.min(${PRODUCT_PAGE_SIZE},`,
    );
  });

  it("blog posts clamps limit at POST_PAGE_SIZE", () => {
    expect(read("app/api/public/v1/blog/posts/route.ts")).toContain(
      `Math.min(${POST_PAGE_SIZE},`,
    );
  });
});

describe("crawlers are kept off /search", () => {
  it("disallows /search in robots.txt", async () => {
    // Self-amplification, not query count, is the real cost here: one /search
    // visit now issues 3 concurrent inbound requests into this same
    // single-process server (lib/api/client.ts targets localhost), and the
    // root layout is force-dynamic so none of it caches. A crawler walking a
    // results state would multiply that permanently — for a page with no SEO
    // value, that nothing links to, whose products the sitemap already lists.
    const { default: robots } = await import("@/app/robots");
    const disallow = robots().rules;
    const rule = Array.isArray(disallow) ? disallow[0] : disallow;
    expect(rule.disallow).toContain("/search");
  });
});
