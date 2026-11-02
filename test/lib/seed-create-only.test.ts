// Guards the create-only seed invariant. Prod reruns prisma/seed.ts on every
// container start while RUN_DB_SEED=1; an update path in the seed is a
// standing order to revert admin edits on each deploy (Aug 2026: product
// prices reset on every push). These tests pin both the helper's behavior and
// the seed source itself.

import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { ensureRow } from "../../prisma/seed-helpers";

describe("ensureRow", () => {
  it("leaves an existing row completely untouched", async () => {
    const find = vi.fn().mockResolvedValue({ id: "prod-canned-himalayan-oxygen" });
    const create = vi.fn();
    const onCreate = vi.fn();

    await expect(ensureRow(find, create, onCreate)).resolves.toBe(false);

    expect(find).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates a missing row and then runs onCreate for its children", async () => {
    const calls: string[] = [];
    const find = vi.fn().mockResolvedValue(null);
    const create = vi.fn(async () => {
      calls.push("create");
    });
    const onCreate = vi.fn(async () => {
      calls.push("onCreate");
    });

    await expect(ensureRow(find, create, onCreate)).resolves.toBe(true);

    expect(calls).toEqual(["create", "onCreate"]);
  });

  it("works without an onCreate callback", async () => {
    const find = vi.fn().mockResolvedValue(null);
    const create = vi.fn(async () => ({}));

    await expect(ensureRow(find, create)).resolves.toBe(true);
    expect(create).toHaveBeenCalledOnce();
  });
});

describe("prisma/seed.ts source", () => {
  const source = readFileSync(
    new URL("../../prisma/seed.ts", import.meta.url),
    "utf8",
  );

  it("does not upsert content entities (update path would revert admin edits)", () => {
    for (const forbidden of [
      "product.upsert",
      "siteConfig.upsert",
      "element.upsert",
      "category.upsert",
      "blogPost.upsert",
      "blogCategory.upsert",
      "bundle.upsert",
      "collection.upsert",
      "page.upsert",
      "service.upsert",
      "showroom.upsert",
      "homepageConfig.upsert",
    ]) {
      expect(source, `seed.ts must not call ${forbidden}`).not.toContain(
        forbidden,
      );
    }
  });

  it("does not rebuild child tables of possibly-live parents", () => {
    for (const forbidden of [
      "productImage.deleteMany",
      "productVariation.deleteMany",
      "bundleItem.deleteMany",
      "collectionProduct.deleteMany",
    ]) {
      expect(source, `seed.ts must not call ${forbidden}`).not.toContain(
        forbidden,
      );
    }
  });
});
