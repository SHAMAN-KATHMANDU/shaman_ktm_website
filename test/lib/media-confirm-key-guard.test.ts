// Confirm used to accept any key, and deleting the resulting Media row then
// deleted that object — in a bucket shared with IMS. Only keys of the exact
// shape sign hands out may be confirmed, and only once.

import { describe, expect, it, vi, beforeEach } from "vitest";

let existingRow: { id: string } | null = null;
const { create } = vi.hoisted(() => ({
  create: vi.fn(async ({ data }: { data: { key: string } }) => ({ id: "m1", ...data })),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    media: {
      findUnique: vi.fn(async () => existingRow),
      create,
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/s3", () => ({
  objectHead: async () => ({ exists: true, bytes: 10, mime: "image/jpeg" }),
  s3PublicUrl: (k: string) => `https://cdn.test/${k}`,
  presignPut: async () => "https://s3.test/put",
  putObject: async () => "",
}));

import { confirmMediaUpload } from "@/lib/cms/media";

const SIGNED = "uploads/2026-11-14/photo-AbC_12-x.jpg";

describe("confirmMediaUpload", () => {
  beforeEach(() => {
    existingRow = null;
    create.mockClear();
  });

  it("accepts a key in the shape sign hands out", async () => {
    await expect(confirmMediaUpload({ key: SIGNED })).resolves.toHaveProperty("isNew", true);
  });

  it.each([
    "ims/products/123.jpg",
    "uploads/../ims/products/123.jpg",
    "uploads/sessions/s1/2026-11-14/photo-abcdefgh.jpg",
    "uploads/2026-11-14/page.html",
  ])("refuses %s", async (key) => {
    await expect(confirmMediaUpload({ key })).rejects.toThrow(/Unknown upload key/);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a key that already has a Media row", async () => {
    existingRow = { id: "other" };
    await expect(confirmMediaUpload({ key: SIGNED })).rejects.toThrow(/already confirmed/);
  });

  it("accepts a session key only under that session's directory", async () => {
    const key = "uploads/sessions/s1/2026-11-14/photo-abcdefgh.webp";
    await expect(
      confirmMediaUpload({ key }, undefined, "uploads/sessions/s1"),
    ).resolves.toHaveProperty("isNew", true);
    await expect(
      confirmMediaUpload({ key }, undefined, "uploads/sessions/s2"),
    ).rejects.toThrow(/Unknown upload key/);
  });
});
