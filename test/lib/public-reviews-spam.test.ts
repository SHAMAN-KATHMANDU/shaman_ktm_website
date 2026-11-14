// The public reviews endpoint only de-duplicated (product, authorName), so a
// script could post unlimited reviews by varying the name.

import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn(async () => ({ id: "r1" }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findFirst: async () => ({ id: "p1" }) },
    review: { count: async () => 0, create },
  },
}));

const { POST } = await import("@/app/api/public/v1/reviews/route");

const post = (ip: string, extra: Record<string, unknown> = {}) =>
  POST(
    new Request("http://localhost/api/public/v1/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": ip },
      body: JSON.stringify({
        productId: "p1",
        rating: 5,
        title: "t",
        body: "b",
        authorName: `a-${Math.random()}`,
        ...extra,
      }),
    }),
  );

describe("public reviews spam guards", () => {
  beforeEach(() => create.mockClear());

  it("limits one IP to 5 reviews per window", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await post("5.5.5.5")).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("drops honeypot submissions without storing them", async () => {
    const res = await post("6.6.6.6", { website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(create).not.toHaveBeenCalled();
  });
});
