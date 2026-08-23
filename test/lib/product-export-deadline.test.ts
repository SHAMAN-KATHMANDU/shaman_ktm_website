// The export's wall-clock cap must be UNDER the proxy budget, or it can never
// do the one job it exists for.
//
// The image phase stops at a deadline and ships the remaining rows without
// photos — that degradation is why the endpoint stopped 504-ing after the
// original incident. But the deadline defaulted to 90s while the route was
// served by nginx's `location /` at proxy_read_timeout 30s: the dedicated 120s
// `location = /api/sysuser/products/export` block existed only in
// deploy/prod/nginx.conf and was not loaded by the live host (PR #117 /
// HIVE-85). So nginx killed the connection a full minute before the app would
// have started degrading. The admin got a 504; the mechanism built to prevent
// that was unreachable.
//
// That is history as of 2026-08-21 10:42 UTC, when the reconciliation was
// applied and the 120s block went live (HIVE-91). The budget below is the
// LIVE one. The defect it guards against is unchanged: a deadline at or above
// the proxy's timeout can never fire.
//
// Neither PRODUCT_EXPORT_DEADLINE_MS nor PRODUCT_EXPORT_IMAGE_CONCURRENCY is
// passed through docker-compose, so the defaults in the module ARE the
// production values.

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
    // Concretely, at today's live budget: 120s − 10s reserve = a 110s cap.
    expect(defaultDeadlineMs()).toBe(110_000);
  });

  it("matches the proxy timeout production actually serves this route with", () => {
    // Pinned deliberately, and this pin has already earned its keep: at 30_000
    // it is what caught the 2026-08-21 reconciliation before that PR merged.
    // It now pins the LIVE value — `proxy_read_timeout 120s` on the dedicated
    // export location, applied to the production host on 2026-08-21 10:42 UTC
    // (HIVE-91). Change it only when the live config changes, never to make a
    // failing test pass.
    // Verify with: ssh shaman_web "sudo nginx -T" | grep -n proxy_read_timeout
    expect(EXPORT_PROXY_BUDGET_MS).toBe(120_000);
  });

  it("tracks a changed budget instead of hard-coding a number", () => {
    // The relationship is the thing being pinned, not the integer — so this
    // probes budgets that are NOT the current default, in both directions.
    // (Passing 120_000 here would pass even if the function ignored its
    // argument and returned the default, which proves nothing.)
    expect(defaultDeadlineMs(180_000)).toBe(170_000);
    expect(defaultDeadlineMs(180_000)).toBeLessThan(180_000);
    expect(defaultDeadlineMs(30_000)).toBe(20_000);
    expect(defaultDeadlineMs(30_000)).toBeLessThan(30_000);
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
