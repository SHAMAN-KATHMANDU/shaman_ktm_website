import { describe, it, expect } from "vitest";
import { formatNpr, formatDate, slugify } from "@/lib/format";

describe("format", () => {
  it("formats NPR with thousands separators", () => {
    // en-IN locale uses lakhs grouping (1,00,000) — that's the intended
    // behaviour for a Nepal-targeted site.
    expect(formatNpr(150000)).toBe("NPR 1,50,000");
    expect(formatNpr(0)).toBe("NPR 0");
  });

  it("rounds non-integer prices", () => {
    expect(formatNpr(99.7)).toBe("NPR 100");
  });

  it("formats ISO dates", () => {
    expect(formatDate("2026-05-04T00:00:00.000Z")).toMatch(
      /\d+ \w{3} 2026/,
    );
  });

  it("slugifies", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("  Spaces  ")).toBe("spaces");
    expect(slugify("Singing Bowl — Tibetan #2")).toBe("singing-bowl-tibetan-2");
  });
});
