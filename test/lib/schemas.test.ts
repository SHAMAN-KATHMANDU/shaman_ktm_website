import { describe, it, expect } from "vitest";
import {
  ProductSchema,
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
