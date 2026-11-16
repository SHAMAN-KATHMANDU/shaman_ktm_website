import { describe, it, expect } from "vitest";
import { ReviewSubmitSchema, StaffReviewSchema } from "@/lib/validation/schemas";

const base = { rating: 5, title: "Calm", body: "A quiet hour.", authorName: "Asha" };

describe("ReviewSubmitSchema (storefront form)", () => {
  it("accepts exactly one target: a product or a service", () => {
    expect(ReviewSubmitSchema.safeParse({ ...base, productId: "p1" }).success).toBe(true);
    expect(ReviewSubmitSchema.safeParse({ ...base, serviceSlug: "sound-healing-stupa" }).success).toBe(true);
  });

  it("rejects no target and both targets", () => {
    expect(ReviewSubmitSchema.safeParse(base).success).toBe(false);
    expect(
      ReviewSubmitSchema.safeParse({ ...base, productId: "p1", serviceSlug: "s" }).success,
    ).toBe(false);
  });

  it("rejects out-of-range ratings and blank text", () => {
    expect(ReviewSubmitSchema.safeParse({ ...base, productId: "p1", rating: 0 }).success).toBe(false);
    expect(ReviewSubmitSchema.safeParse({ ...base, productId: "p1", rating: 6 }).success).toBe(false);
    expect(ReviewSubmitSchema.safeParse({ ...base, productId: "p1", title: "   " }).success).toBe(false);
  });
});

describe("StaffReviewSchema (staff testimonial)", () => {
  it("needs a real outside source, never 'website'", () => {
    expect(StaffReviewSchema.safeParse({ ...base, serviceSlug: "s", source: "whatsapp" }).success).toBe(true);
    expect(StaffReviewSchema.safeParse({ ...base, serviceSlug: "s", source: "website" }).success).toBe(false);
    expect(StaffReviewSchema.safeParse({ ...base, serviceSlug: "s" }).success).toBe(false);
  });

  it("keeps the one-target rule", () => {
    expect(StaffReviewSchema.safeParse({ ...base, source: "google" }).success).toBe(false);
  });
});
