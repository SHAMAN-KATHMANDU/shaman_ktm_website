// AD ⇄ BS conversion. Every reporting row stores both calendars, so a wrong
// conversion silently misfiles a whole month of sales. Landmark dates are
// checked in both directions, plus the Kathmandu-timezone boundary that a
// naive UTC implementation gets wrong.

import { describe, expect, it } from "vitest";
import { adToBs, bsToAd, bsPeriod } from "@/lib/dates";

describe("adToBs", () => {
  it("converts known landmark dates", () => {
    // Nepali New Year 2083 falls on 2026-04-14 AD.
    expect(adToBs(new Date("2026-04-14T06:00:00Z"))).toBe("2083-01-01");
    // Spec's own example: 2026-08-09 AD = 2083-04-24 BS (Shrawan).
    expect(adToBs(new Date("2026-08-09T06:00:00Z"))).toBe("2083-04-24");
  });

  it("zero-pads month and day", () => {
    expect(adToBs(new Date("2026-04-14T06:00:00Z"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("uses the Kathmandu wall clock, not UTC", () => {
    // 19:00 UTC is 00:45 the NEXT day in Nepal (UTC+5:45), so the BS date must
    // advance. A UTC-based implementation would report the previous day.
    const lateUtc = new Date("2026-08-09T19:00:00Z");
    const earlierSameNepaliDay = new Date("2026-08-09T06:00:00Z");
    expect(adToBs(earlierSameNepaliDay)).toBe("2083-04-24");
    expect(adToBs(lateUtc)).toBe("2083-04-25");
  });
});

describe("bsToAd", () => {
  it("round-trips the landmark dates", () => {
    expect(bsToAd("2083-01-01").toISOString().slice(0, 10)).toBe("2026-04-14");
    expect(bsToAd("2083-04-24").toISOString().slice(0, 10)).toBe("2026-08-09");
  });

  it("round-trips through adToBs", () => {
    const ad = new Date("2026-08-09T06:00:00Z");
    expect(bsToAd(adToBs(ad)).toISOString().slice(0, 10)).toBe("2026-08-09");
  });

  it("rejects malformed input", () => {
    expect(() => bsToAd("2083-4-24")).toThrow(RangeError);
    expect(() => bsToAd("not-a-date")).toThrow(RangeError);
    expect(() => bsToAd("")).toThrow(RangeError);
  });
});

describe("bsPeriod", () => {
  it("returns the YYYY-MM BS period for monthly reporting", () => {
    expect(bsPeriod(new Date("2026-08-09T06:00:00Z"))).toBe("2083-04");
  });
});
