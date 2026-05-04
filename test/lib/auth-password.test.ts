import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("auth/password", () => {
  it("hashes and verifies a password round-trip", async () => {
    const plain = "Sup3rSecret!Phrase";
    const hash = await hashPassword(plain);
    expect(hash).not.toEqual(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("produces different hashes for the same input (salt)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toEqual(b);
  });
});
