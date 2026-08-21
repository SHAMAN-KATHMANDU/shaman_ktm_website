// The export's wall-clock cap must be UNDER the proxy budget, or it can never
// do the one job it exists for.
//
// The image phase stops at a deadline and ships the remaining rows without
// photos — that degradation is why the endpoint stopped 504-ing after the
// original incident. But the deadline defaulted to 90s while production serves
// this route through nginx's `location /` at proxy_read_timeout 30s. The 120s
// `location = /api/sysuser/products/export` block it was sized against exists
// only in deploy/prod/nginx.conf and has NEVER been loaded: the live host reads
// /etc/nginx/sites-enabled/shamanktmweb.conf, a regular file with no such
// location (see PR #117 / HIVE-85).
//
// So nginx killed the connection a full minute before the app would have
// started degrading. The admin got a 504; the mechanism built to prevent that
// was unreachable. Neither PRODUCT_EXPORT_DEADLINE_MS nor
// PRODUCT_EXPORT_IMAGE_CONCURRENCY is passed through docker-compose, so the
// defaults in the module ARE the production values.

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  defaultDeadlineMs,
  truncationWarning,
  EXPORT_PROXY_BUDGET_MS,
} from "@/lib/cms/product-export";

describe("the image-phase deadline", () => {
  it("leaves the proxy time to actually deliver the response", () => {
    // The invariant. Strictly under, not equal: the deadline covers only the
    // image phase, and the query, workbook build and ~1.8 MB serialisation all
    // still have to happen inside the same budget.
    expect(defaultDeadlineMs()).toBeLessThan(EXPORT_PROXY_BUDGET_MS);
    expect(EXPORT_PROXY_BUDGET_MS - defaultDeadlineMs()).toBeGreaterThanOrEqual(5_000);
  });

  it("matches the proxy timeout production actually serves this route with", () => {
    // Pinned deliberately. If HIVE-83 reconciles the live nginx config and the
    // 120s block becomes real, this test is where someone finds out the number
    // is now wrong — rather than the deadline quietly staying pessimistic.
    // Verify with: ssh shaman_web "sudo nginx -T" | grep -n proxy_read_timeout
    expect(EXPORT_PROXY_BUDGET_MS).toBe(30_000);
  });

  it("tracks a raised budget instead of hard-coding a number", () => {
    // The relationship is the thing being pinned, not the integer. Raise the
    // budget and the deadline follows; the headroom is preserved either way.
    expect(defaultDeadlineMs(120_000)).toBe(110_000);
    expect(defaultDeadlineMs(120_000)).toBeLessThan(120_000);
  });

  it("never goes non-positive, however small the budget", () => {
    // A deadline of 0 or less would skip every photo silently — worse than a
    // slow export, and reachable by a careless env value.
    expect(defaultDeadlineMs(5_000)).toBeGreaterThan(0);
    expect(defaultDeadlineMs(0)).toBeGreaterThan(0);
    expect(defaultDeadlineMs(-1)).toBeGreaterThan(0);
  });
});

describe("a truncated export says so", () => {
  it("is silent when every photo made it", () => {
    expect(truncationWarning(295, 295)).toBeNull();
    // Defensive: more attempted than total must not read as truncation.
    expect(truncationWarning(295, 300)).toBeNull();
    expect(truncationWarning(0, 0)).toBeNull();
  });

  it("names both counts and the remainder when photos were dropped", () => {
    const msg = truncationWarning(295, 120);
    expect(msg).not.toBeNull();
    expect(msg).toContain("120 of 295");
    expect(msg).toContain("175"); // the remainder, stated rather than implied
    // It must not read as data loss: the rows are all there.
    expect(msg).toContain("All image URLs");
    // And it must not invite the fix that reintroduces the 504.
    expect(msg).toContain("proxy budget");
  });

  it("fires for a single dropped photo, not just a big shortfall", () => {
    expect(truncationWarning(295, 294)).not.toBeNull();
  });
});
