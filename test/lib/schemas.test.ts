import { describe, it, expect } from "vitest";
import {
  ProductSchema,
  ProductUpdateSchema,
  RedirectSchema,
  MediaSignRequest,
} from "@/lib/validation/schemas";

describe("validation/schemas", () => {
  it("ProductSchema accepts a minimal valid product", () => {
    const result = ProductSchema.safeParse({
      slug: "singing-bowl",
      name: "Singing Bowl",
      description: "A bowl that sings.",
      price: 4500,
    });
    expect(result.success).toBe(true);
  });

  it("ProductSchema rejects bad slug", () => {
    const result = ProductSchema.safeParse({
      slug: "Singing Bowl",
      name: "x",
      description: "x",
      price: 1,
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["create", ProductSchema],
    ["update", ProductUpdateSchema],
  ])("%s product payload rejects duplicate variation SKUs", (_kind, schema) => {
    const result = schema.safeParse({
      slug: "singing-bowl",
      name: "Singing Bowl",
      description: "A bowl that sings.",
      price: 4500,
      variations: [
        { sku: "SB-RED", price: 4500 },
        { sku: "SB-RED", price: 5000 },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("names case/whitespace-twin SKUs and the variations carrying them", () => {
    const result = ProductSchema.safeParse({
      slug: "singing-bowl",
      name: "Singing Bowl",
      description: "A bowl that sings.",
      price: 4500,
      variations: [
        { sku: "SB-RED", price: 4500 },
        { sku: "  sb-red  ", price: 5000 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["variations", 1, "sku"],
        message:
          'Duplicate variation SKU "SB-RED"; variation 1 ("SB-RED"), variation 2 ("  sb-red  ") carry it',
      });
    }
  });

  it("accepts distinct variation SKUs and permits reuse across products", () => {
    const product = {
      name: "Singing Bowl",
      description: "A bowl that sings.",
      price: 4500,
      variations: [
        { sku: "SB-RED", price: 4500 },
        { sku: "SB-BLUE", price: 5000 },
      ],
    };

    expect(ProductSchema.safeParse({ ...product, slug: "bowl-one" }).success).toBe(
      true,
    );
    expect(ProductSchema.safeParse({ ...product, slug: "bowl-two" }).success).toBe(
      true,
    );
  });

  it("RedirectSchema requires fromPath to start with /", () => {
    expect(
      RedirectSchema.safeParse({ fromPath: "old", toPath: "/new" }).success,
    ).toBe(false);
    expect(
      RedirectSchema.safeParse({ fromPath: "/old", toPath: "/new" }).success,
    ).toBe(true);
  });

  it("MediaSignRequest only allows allowlisted MIME types", () => {
    const ok = MediaSignRequest.safeParse({
      filename: "x.jpg",
      contentType: "image/jpeg",
      bytes: 1024,
    });
    expect(ok.success).toBe(true);

    const svg = MediaSignRequest.safeParse({
      filename: "x.svg",
      contentType: "image/svg+xml",
      bytes: 1024,
    });
    expect(svg.success).toBe(false);

    const tooBig = MediaSignRequest.safeParse({
      filename: "x.jpg",
      contentType: "image/jpeg",
      bytes: 500 * 1024 * 1024,
    });
    expect(tooBig.success).toBe(false);
  });
});
