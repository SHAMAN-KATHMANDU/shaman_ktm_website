import { describe, it, expect } from "vitest";
import {
  ProductSchema,
  ServiceSchema,
  HomeCopySchema,
  ElementSchema,
} from "@/lib/validation/schemas";

describe("schemas accept Nepali (*Ne) fields", () => {
  it("ProductSchema round-trips nameNe / descriptionNe / seo*Ne", () => {
    const result = ProductSchema.safeParse({
      slug: "singing-bowl",
      name: "Singing Bowl",
      nameNe: "गायनकटोरा",
      description: "A bowl that sings.",
      descriptionNe: "गाउने कटोरा।",
      price: 4500,
      seoTitleNe: "गायनकटोरा | शमन",
      seoDescriptionNe: "ध्यानका लागि।",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nameNe).toBe("गायनकटोरा");
      expect(result.data.descriptionNe).toBe("गाउने कटोरा।");
    }
  });

  it("ProductSchema still accepts English-only payloads", () => {
    expect(
      ProductSchema.safeParse({
        slug: "incense",
        name: "Incense",
        description: "Smells nice.",
        price: 200,
      }).success,
    ).toBe(true);
  });

  it("ServiceSchema accepts a Nepali whatToExpect array", () => {
    const result = ServiceSchema.safeParse({
      slug: "sound-bath",
      name: "Sound Bath",
      nameNe: "ध्वनि स्नान",
      element: "water",
      duration: "45 min",
      durationNe: "४५ मिनेट",
      pricePerSession: 3000,
      summary: "Relax.",
      summaryNe: "आराम गर्नुहोस्।",
      whatToExpect: ["Arrive early"],
      whatToExpectNe: ["चाँडै आउनुहोस्"],
    });
    expect(result.success).toBe(true);
  });

  it("ElementSchema accepts Nepali twins", () => {
    expect(
      ElementSchema.safeParse({
        slug: "metal",
        name: "Metal",
        nameNe: "धातु",
        icon: "i",
        accent: "#aaa",
        natureSource: "ore",
        natureSourceNe: "खानी",
        energyDescription: "clarity",
        energyDescriptionNe: "स्पष्टता",
      }).success,
    ).toBe(true);
  });

  it("HomeCopySchema accepts auto-generated *Ne keys", () => {
    const result = HomeCopySchema.safeParse({
      heroTitle: "Welcome",
      heroTitleNe: "स्वागत छ",
      brandStripLinesNe: ["क", "ख"],
    });
    expect(result.success).toBe(true);
  });
});
