// AD ⇄ BS (Bikram Sambat) date conversion for the reporting system.
//
// Every reporting row stores BOTH calendars (spec: dateAd + dateBs). The BS
// date is always derived server-side from the instant's wall-clock date in
// Asia/Kathmandu (UTC+5:45) — a sale at 20:30 UTC on Aug 9 happened on Aug 10
// in Nepal, and its BS date must say so.
//
// Conversion data comes from `nepali-date-converter` (validated against
// landmark dates in test/lib/dates.test.ts, e.g. 2026-08-09 AD = 2083-04-24 BS
// and Nepali New Year 2083-01-01 = 2026-04-14 AD).

import NepaliDate from "nepali-date-converter";

const KATHMANDU_TZ = "Asia/Kathmandu";

const BS_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Year/month/day of an instant as seen on a Kathmandu wall clock. */
function kathmanduYmd(instant: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KATHMANDU_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/**
 * Convert an instant to its Bikram Sambat calendar date in Nepal,
 * formatted "YYYY-MM-DD" (e.g. "2083-04-24").
 */
export function adToBs(instant: Date = new Date()): string {
  const { y, m, d } = kathmanduYmd(instant);
  // NepaliDate converts from the *local components* of the JS date it is
  // given, so hand it a date whose local components are the Kathmandu ones.
  const bs = new NepaliDate(new Date(y, m - 1, d));
  const mm = String(bs.getMonth() + 1).padStart(2, "0");
  const dd = String(bs.getDate()).padStart(2, "0");
  return `${bs.getYear()}-${mm}-${dd}`;
}

/**
 * Convert a "YYYY-MM-DD" BS date string to the corresponding AD calendar day,
 * returned as a Date at UTC midnight of that day (safe to `.toISOString()`
 * and slice the date part). Throws CmsError-compatible RangeError on bad input.
 */
export function bsToAd(dateBs: string): Date {
  const match = BS_RE.exec(dateBs);
  if (!match) {
    throw new RangeError(
      `Invalid BS date "${dateBs}" — expected "YYYY-MM-DD" (e.g. "2083-04-24")`,
    );
  }
  const [, y, m, d] = match;
  // NepaliDate months are 0-indexed. toJsDate() returns local midnight — read
  // its *local* components (never toISOString, which shifts across UTC).
  const ad = new NepaliDate(Number(y), Number(m) - 1, Number(d)).toJsDate();
  return new Date(Date.UTC(ad.getFullYear(), ad.getMonth(), ad.getDate()));
}

/** "YYYY-MM" BS period (e.g. "2083-04") for monthly reporting rows. */
export function bsPeriod(instant: Date = new Date()): string {
  return adToBs(instant).slice(0, 7);
}
