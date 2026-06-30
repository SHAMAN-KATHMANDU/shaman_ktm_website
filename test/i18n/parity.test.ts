import { describe, it, expect } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import ne from "@/lib/i18n/messages/ne.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, key)
      : [key];
  });
}

function leafValues(obj: Record<string, unknown>): string[] {
  return Object.values(obj).flatMap((v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? leafValues(v as Record<string, unknown>)
      : [String(v)],
  );
}

describe("i18n message catalog", () => {
  it("en.json and ne.json have identical keys", () => {
    expect(flatten(ne).sort()).toEqual(flatten(en).sort());
  });

  it("ne.json has no empty translations", () => {
    expect(leafValues(ne).filter((v) => v.trim() === "")).toEqual([]);
  });
});
