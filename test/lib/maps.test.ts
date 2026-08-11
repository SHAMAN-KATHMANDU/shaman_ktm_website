// A showroom map is either a real Google embed or nothing.
//
// The live contact page rendered four boxes of Google's own error text —
// "Google Maps Platform rejected your request. Invalid 'pb' parameter." —
// because placeholder embed URLs from the mock data were seeded into
// production. A customer looking for the shop saw an error where the map should
// be, with the address sitting right underneath it.

import { describe, expect, it } from "vitest";
import { isRenderableMapEmbed } from "@/lib/maps";

// A real URL from Google Maps → Share → Embed a map (truncated in the middle,
// but with a pb payload of realistic length).
const REAL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3531.06!2d85.3095!3d27.7154!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb19a1b0b0b0b1%3A0xabcdef0123456789!2sThamel%2C%20Kathmandu!5e0!3m2!1sen!2snp!4v1700000000000!5m2!1sen!2snp";

// What actually shipped: hand-made coordinates, no place data.
const PLACEHOLDER =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3531.0!2d85.3122!3d27.7152!2m3!1f0!2f0!3f0";

describe("isRenderableMapEmbed", () => {
  it("accepts a real Google embed URL", () => {
    expect(isRenderableMapEmbed(REAL)).toBe(true);
  });

  it("rejects the placeholder that shipped to production", () => {
    // This is the whole point: it LOOKS like an embed URL, and Google rejects it.
    expect(isRenderableMapEmbed(PLACEHOLDER)).toBe(false);
  });

  it("treats unset as no map", () => {
    expect(isRenderableMapEmbed(null)).toBe(false);
    expect(isRenderableMapEmbed(undefined)).toBe(false);
    expect(isRenderableMapEmbed("")).toBe(false);
  });

  it("rejects a Google embed with no pb payload at all", () => {
    expect(isRenderableMapEmbed("https://www.google.com/maps/embed")).toBe(false);
    expect(isRenderableMapEmbed("https://www.google.com/maps/embed?pb=")).toBe(
      false,
    );
  });

  it("refuses anything that is not a Google Maps embed", () => {
    // The value becomes an iframe src, so the host matters as much as the shape.
    expect(isRenderableMapEmbed(`https://evil.example.com/maps/embed?pb=${"x".repeat(200)}`)).toBe(false);
    expect(isRenderableMapEmbed(`https://www.google.com/search?pb=${"x".repeat(200)}`)).toBe(false);
    expect(isRenderableMapEmbed("not a url at all")).toBe(false);
  });

  it("refuses plain http, since this is embedded on an https page", () => {
    expect(isRenderableMapEmbed(REAL.replace("https://", "http://"))).toBe(false);
  });
});
