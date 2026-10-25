import { describe, it, expect } from "vitest";
import { resolveHeroTile } from "@/lib/home-hero-tiles";
import { HomepageConfigSchema, HeroTileSchema } from "@/lib/validation/schemas";

const bowl = {
  id: "p1",
  slug: "singing-bowl",
  name: "Singing Bowl",
  nameNe: "गाउने कचौरा",
  thumbnailUrl: "https://cdn.test/bowl-thumb.jpg",
  firstImageUrl: "https://cdn.test/bowl-1.jpg",
};

const metals = {
  slug: "metal-collection",
  title: "Metal",
  titleNe: "धातु",
  heroImageUrl: "https://cdn.test/metal-hero.jpg",
};

describe("resolveHeroTile", () => {
  it("prefers the explicit image, then the collection hero, then the product photo", () => {
    expect(
      resolveHeroTile({ imageUrl: "/uploads/x.jpg" }, bowl, metals)?.imageUrl,
    ).toBe("/uploads/x.jpg");
    expect(resolveHeroTile({}, bowl, metals)?.imageUrl).toBe(metals.heroImageUrl);
    expect(resolveHeroTile({}, bowl, undefined)?.imageUrl).toBe(bowl.thumbnailUrl);
    expect(
      resolveHeroTile({}, { ...bowl, thumbnailUrl: null }, undefined)?.imageUrl,
    ).toBe(bowl.firstImageUrl);
  });

  it("links to the product, else the collection", () => {
    expect(resolveHeroTile({}, bowl, metals)?.href).toBe("/products/singing-bowl");
    expect(resolveHeroTile({}, undefined, metals)?.href).toBe(
      "/collections/metal-collection",
    );
  });

  it("captions with the override, else the localized product / collection name", () => {
    expect(resolveHeroTile({ label: "Sound" }, bowl, undefined)?.label).toBe("Sound");
    expect(resolveHeroTile({}, bowl, undefined, "ne")?.label).toBe("गाउने कचौरा");
    expect(resolveHeroTile({}, undefined, metals, "ne")?.label).toBe("धातु");
    expect(
      resolveHeroTile({ label: "Sound", labelNe: "ध्वनि" }, bowl, undefined, "ne")?.label,
    ).toBe("ध्वनि");
  });

  it("drops tiles with nothing to link or no picture", () => {
    expect(resolveHeroTile({ imageUrl: "/x.jpg" }, undefined, undefined)).toBeNull();
    expect(
      resolveHeroTile(
        {},
        { ...bowl, thumbnailUrl: null, firstImageUrl: null },
        undefined,
      ),
    ).toBeNull();
  });
});

describe("HomepageConfigSchema.heroTiles", () => {
  it("defaults to an empty wall and keeps tiles through a parse", () => {
    expect(HomepageConfigSchema.parse({}).heroTiles).toEqual([]);
    const tiles = [{ productId: "p1", collectionSlug: null, imageUrl: "/a.jpg", label: "A" }];
    expect(HomepageConfigSchema.parse({ heroTiles: tiles }).heroTiles).toEqual(tiles);
  });

  it("caps the wall at four tiles", () => {
    const five = Array.from({ length: 5 }, () => ({ productId: "p1" }));
    expect(HomepageConfigSchema.safeParse({ heroTiles: five }).success).toBe(false);
  });

  it("rejects a picture that is neither a path nor an http(s) URL", () => {
    expect(HeroTileSchema.safeParse({ imageUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});
