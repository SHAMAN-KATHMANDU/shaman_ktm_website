import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/safe-next";

describe("safeNext", () => {
  it.each([
    "/\\evil.com",
    "//evil.com",
    "https://evil.com/x",
    "/.//evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
  ])("refuses %s", (next) => {
    expect(safeNext(next, "/home")).toBe("/home");
  });

  it("keeps a same-origin path with its query and hash", () => {
    expect(safeNext("/ne/account/orders?x=1#top", "/home")).toBe(
      "/ne/account/orders?x=1#top",
    );
  });

  it("falls back when nothing is given", () => {
    expect(safeNext(null, "/home")).toBe("/home");
  });
});
