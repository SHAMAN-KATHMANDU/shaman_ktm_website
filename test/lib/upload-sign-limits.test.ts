// A presigned PUT used to bind neither size nor count: an upload link could
// sign unlimited URLs (the cap counted confirms) and each URL accepted any
// size, with the extension taken from the caller's filename.

import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  // Dummy credentials: presigning is pure computation, nothing is sent.
  process.env.S3_ACCESS_KEY_ID = "AKIATESTTESTTEST";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret";
});

let capClaimed = 1;
vi.mock("@/lib/db", () => ({
  prisma: {
    uploadSession: { updateMany: vi.fn(async () => ({ count: capClaimed })) },
  },
}));

import { signMediaUpload } from "@/lib/cms/media";
import { signSessionUpload } from "@/lib/upload-sessions/uploads";

describe("signMediaUpload", () => {
  it("binds the declared size and type into the signature", async () => {
    const { uploadUrl } = await signMediaUpload({
      filename: "photo.jpg",
      contentType: "image/jpeg",
      bytes: 1234,
    });
    const signed = new URL(uploadUrl).searchParams.get("X-Amz-SignedHeaders");
    expect(signed?.split(";")).toContain("content-length");
    expect(signed?.split(";")).toContain("content-type");
  });

  it("takes the extension from the allowlisted type, not the filename", async () => {
    const { key } = await signMediaUpload({
      filename: "payload.html",
      contentType: "image/png",
      bytes: 10,
    });
    expect(key).toMatch(/\.png$/);
  });
});

describe("signSessionUpload", () => {
  const session = {
    id: "s1",
    uploadCount: 0,
    slots: [{ id: "slot1" }],
  } as never;
  const input = {
    slotId: "slot1",
    filename: "a.jpg",
    contentType: "image/jpeg",
    bytes: 10,
  };

  it("counts a sign toward the cap", async () => {
    capClaimed = 1;
    await expect(signSessionUpload(session, input)).resolves.toHaveProperty("key");
  });

  it("refuses to sign once the cap is used up, confirmed or not", async () => {
    capClaimed = 0;
    await expect(signSessionUpload(session, input)).rejects.toThrow(/Upload cap/);
  });
});
