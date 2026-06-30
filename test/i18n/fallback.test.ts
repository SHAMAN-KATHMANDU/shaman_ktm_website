import { describe, it, expect } from "vitest";
import {
  resolveI18nField,
  productSummaryFromRow,
  serviceFromRow,
} from "@/lib/api/server/dto";
import {
  splitLocale,
  stripLocale,
  localizeHref,
  pickLocalized,
} from "@/lib/i18n/locale";

describe("resolveI18nField", () => {
  const row = { name: "Singing Bowl", nameNe: "गायनकटोरा", blank: "x", blankNe: "  " };

  it("returns Nepali when present and locale is ne", () => {
    expect(resolveI18nField(row, "name", "ne")).toBe("गायनकटोरा");
  });

  it("falls back to English when Nepali is whitespace-only", () => {
    expect(resolveI18nField(row, "blank", "ne")).toBe("x");
  });

  it("falls back to English when Nepali is missing", () => {
    expect(resolveI18nField({ name: "Only EN" }, "name", "ne")).toBe("Only EN");
  });

  it("always uses English for the en locale", () => {
    expect(resolveI18nField(row, "name", "en")).toBe("Singing Bowl");
  });

  it("defaults to en when no locale is passed", () => {
    expect(resolveI18nField(row, "name")).toBe("Singing Bowl");
  });
});

describe("DTO mappers resolve locale", () => {
  const baseProduct = {
    id: "p1",
    slug: "singing-bowl",
    name: "Singing Bowl",
    nameNe: "गायनकटोरा",
    price: 4500,
    compareAtPrice: null,
    currency: "NPR",
    thumbnailUrl: null,
    categoryId: null,
    vendorId: null,
    description: "A bowl that sings.",
    tags: [],
    createdAt: new Date("2026-01-01"),
    variations: [],
  };

  it("productSummaryFromRow returns Nepali name under ne", () => {
    expect(productSummaryFromRow(baseProduct, "ne").name).toBe("गायनकटोरा");
  });

  it("productSummaryFromRow returns English name under en", () => {
    expect(productSummaryFromRow(baseProduct, "en").name).toBe("Singing Bowl");
  });

  it("productSummaryFromRow falls back to English when Nepali absent", () => {
    const { nameNe: _drop, ...enOnly } = baseProduct;
    expect(productSummaryFromRow(enOnly, "ne").name).toBe("Singing Bowl");
  });

  it("serviceFromRow swaps the whatToExpect array for ne when provided", () => {
    const svc = {
      slug: "sound-bath",
      name: "Sound Bath",
      nameNe: "ध्वनि स्नान",
      element: "water",
      duration: "45 min",
      pricePerSession: 3000,
      hero: null,
      summary: "Relax.",
      whatToExpect: ["Arrive early"],
      whatToExpectNe: ["चाँडै आउनुहोस्"],
      relatedProductSlugs: [],
    };
    expect(serviceFromRow(svc, "ne").whatToExpect).toEqual(["चाँडै आउनुहोस्"]);
    expect(serviceFromRow(svc, "en").whatToExpect).toEqual(["Arrive early"]);
  });
});

describe("locale path helpers", () => {
  it("splitLocale extracts the /ne prefix", () => {
    expect(splitLocale("/ne/products/bowl")).toEqual({
      locale: "ne",
      path: "/products/bowl",
    });
  });

  it("splitLocale defaults to en for unprefixed paths", () => {
    expect(splitLocale("/products")).toEqual({ locale: "en", path: "/products" });
  });

  it("stripLocale removes the locale prefix", () => {
    expect(stripLocale("/ne/contact")).toBe("/contact");
    expect(stripLocale("/contact")).toBe("/contact");
  });

  it("localizeHref keeps English unprefixed and prefixes Nepali", () => {
    expect(localizeHref("/products", "en")).toBe("/products");
    expect(localizeHref("/products", "ne")).toBe("/ne/products");
    // idempotent: switching an already-prefixed path
    expect(localizeHref("/ne/products", "en")).toBe("/products");
    expect(localizeHref("/", "ne")).toBe("/ne");
  });

  it("pickLocalized resolves with English fallback", () => {
    const copy = { heroTitle: "Welcome", heroTitleNe: "स्वागत छ" };
    expect(pickLocalized(copy, "heroTitle", "ne")).toBe("स्वागत छ");
    expect(pickLocalized(copy, "heroTitle", "en")).toBe("Welcome");
    expect(pickLocalized({ heroTitle: "Welcome" }, "heroTitle", "ne")).toBe("Welcome");
  });
});
