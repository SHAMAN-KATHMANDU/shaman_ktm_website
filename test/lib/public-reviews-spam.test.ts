// The public reviews endpoint only de-duplicated (product, authorName), so a
// script could post unlimited reviews by varying the name.

import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.fn(async (args: unknown) => ({ id: "r1", args }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findFirst: async () => ({ id: "p1" }) },
    service: {
      findFirst: async ({ where }: { where: { slug: string } }) =>
        where.slug === "sound-healing-stupa" ? { slug: where.slug } : null,
    },
    review: { count: async () => 0, create },
  },
}));
const modules = { reviews: true };
vi.mock("@/lib/site-modules", () => ({ getSiteModules: async () => modules }));

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
  beforeEach(() => {
    create.mockClear();
    modules.reviews = true;
  });

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

  it("stores a service review as an unapproved website submission", async () => {
    const res = await post("7.7.7.7", { productId: undefined, serviceSlug: "sound-healing-stupa" });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: null,
        serviceSlug: "sound-healing-stupa",
        source: "website",
        isApproved: false,
      }),
    });
  });

  it("404s an unknown service and a review with two targets is a 400", async () => {
    expect((await post("8.8.8.8", { productId: undefined, serviceSlug: "nope" })).status).toBe(404);
    expect((await post("8.8.8.9", { serviceSlug: "sound-healing-stupa" })).status).toBe(400);
  });

  it("refuses submissions while the reviews module is off", async () => {
    modules.reviews = false;
    expect((await post("9.9.9.9")).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});
