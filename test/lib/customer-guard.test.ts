// Customer cookies are stateless too: a password change or reset bumps
// Customer.sessionVersion, and every cookie stamped with an older value must
// stop working.

import { describe, expect, it, vi, beforeEach } from "vitest";

const destroy = vi.fn();
let session: Record<string, unknown> = {};
let customerRow: Record<string, unknown> | null = null;

vi.mock("@/lib/auth/customer-session", () => ({
  getCustomerSession: async () => session,
}));
vi.mock("@/lib/db", () => ({
  prisma: { customer: { findUnique: async () => customerRow } },
}));

import { customerGuard } from "@/lib/auth/customer-guard";

describe("customer guard", () => {
  beforeEach(() => {
    destroy.mockClear();
    session = { customerId: "c1", email: "c@local.test", sv: 2, destroy };
  });

  it("rejects a cookie whose version is behind the account", async () => {
    customerRow = { sessionVersion: 3 };
    const g = await customerGuard();
    expect(g.ok).toBe(false);
    expect(destroy).toHaveBeenCalled();
  });

  it("rejects a cookie for a deleted customer", async () => {
    customerRow = null;
    expect((await customerGuard()).ok).toBe(false);
  });

  it("admits a cookie at the current version", async () => {
    customerRow = { sessionVersion: 2 };
    expect((await customerGuard()).ok).toBe(true);
    expect(destroy).not.toHaveBeenCalled();
  });
});
