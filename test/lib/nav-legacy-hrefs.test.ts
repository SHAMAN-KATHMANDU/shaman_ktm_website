import { describe, expect, it, vi } from "vitest";

// site-content pulls in prisma + next/cache at module scope; neither is
// exercised by the pure href rewriter under test.
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

import { repointLegacyNatureHrefs } from "@/lib/site-content";

describe("repointLegacyNatureHrefs", () => {
  it("rewrites the bare /nature href to /products", () => {
    expect(repointLegacyNatureHrefs("/nature")).toBe("/products");
  });

  it("rewrites element hrefs onto the chip filter", () => {
    expect(repointLegacyNatureHrefs("/nature/metal")).toBe(
      "/products?element=metal",
    );
    expect(repointLegacyNatureHrefs("/nature/water")).toBe(
      "/products?element=water",
    );
  });

  it("sends unknown element slugs to the plain catalog", () => {
    expect(repointLegacyNatureHrefs("/nature/bogus")).toBe("/products");
  });

  it("leaves unrelated strings and labels alone", () => {
    expect(repointLegacyNatureHrefs("/products")).toBe("/products");
    expect(repointLegacyNatureHrefs("/energy")).toBe("/energy");
    expect(repointLegacyNatureHrefs("Nature")).toBe("Nature");
    expect(repointLegacyNatureHrefs("/naturewalk")).toBe("/naturewalk");
  });

  it("walks a stored nav config shape", () => {
    const stored = {
      heroPrimaryCta: { label: "Explore Nature", href: "/nature" },
      headerLinks: [
        { label: "Home", href: "/" },
        { label: "Nature", href: "/nature" },
      ],
      footerColumns: [
        { heading: "Explore", links: [{ label: "Metal", href: "/nature/metal" }] },
      ],
    };
    expect(repointLegacyNatureHrefs(stored)).toEqual({
      heroPrimaryCta: { label: "Explore Nature", href: "/products" },
      headerLinks: [
        { label: "Home", href: "/" },
        { label: "Nature", href: "/products" },
      ],
      footerColumns: [
        {
          heading: "Explore",
          links: [{ label: "Metal", href: "/products?element=metal" }],
        },
      ],
    });
  });
});
