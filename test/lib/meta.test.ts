import { describe, it, expect } from "vitest";
import { formatMetaPrice } from "@/lib/meta-format";
import { normalizePhone, hashSha256 } from "@/lib/meta-capi";

describe("formatMetaPrice", () => {
  it("renders whole-rupee prices with two decimals for Meta surfaces", () => {
    expect(formatMetaPrice(4500)).toBe("4500.00");
    expect(formatMetaPrice(0)).toBe("0.00");
  });
});

describe("normalizePhone", () => {
  it("prefixes 977 onto local 10-digit Nepali mobiles", () => {
    expect(normalizePhone("9812345678")).toBe("9779812345678");
    expect(normalizePhone("981-234 5678")).toBe("9779812345678");
  });

  it("keeps numbers that already carry a country code", () => {
    expect(normalizePhone("+977 9812345678")).toBe("9779812345678");
  });
});

describe("hashSha256", () => {
  it("produces the Meta-spec lowercase hex digest", () => {
    // Known SHA-256 of "test@example.com".
    expect(hashSha256("test@example.com")).toBe(
      "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
    );
  });
});
