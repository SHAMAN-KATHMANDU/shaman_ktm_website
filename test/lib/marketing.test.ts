// Marketing invariants. The dangerous one is currency: the Meta export is in
// AUD, so a missing or wrong FX rate produces an "NPR" figure roughly 90× too
// small — a number that looks entirely plausible in a report. Hence:
//   · toNpr refuses a zero/negative/absent rate rather than defaulting to 1
//   · the original amount, its currency and the rate are all kept, so the
//     conversion stays auditable
//   · CSV import SKIPS a row without a usable rate and says why
// Also covered: social metrics upsert (one truth per month per platform),
// footfall conversion derived rather than typed, and the free-text inquiry path
// that keeps staff from falling back to a notebook.

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  footfall: [] as Row[],
  inquiries: [] as Row[],
  social: [] as Row[],
  content: [] as Row[],
  adSpend: [] as Row[],
  showrooms: [] as Row[],
  staff: [] as Row[],
  sales: [] as Row[],
  variations: [] as Row[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;
const clone = <T>(v: T): T =>
  JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? Number(val) : val))) as T;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (v instanceof Date || row[k] instanceof Date) {
      // Dates compare by value, like a database does — reference equality would
      // make every compound-key lookup miss.
      return (
        new Date(row[k] as string).getTime() === new Date(v as string).getTime()
      );
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const c = v as Row;
      if ("gte" in c || "lte" in c) {
        const t = new Date(row[k] as string).getTime();
        if ("gte" in c && t < new Date(c.gte as string).getTime()) return false;
        if ("lte" in c && t > new Date(c.lte as string).getTime()) return false;
        return true;
      }
      if ("not" in c) return row[k] !== c.not;
    }
    return row[k] === v;
  });
}

function model(store: () => Row[]) {
  return {
    findUnique: async ({ where }: { where: Row }) => {
      // Compound unique keys arrive as a single nested object.
      const nested = Object.values(where).find(
        (v) => v && typeof v === "object" && !(v instanceof Date),
      ) as Row | undefined;
      const criteria = nested ?? where;
      const row = store().find((r) => matches(r, criteria));
      return row ? clone(row) : null;
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = store().find((r) => matches(r, where ?? {}));
      return row ? clone(row) : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) =>
      store()
        .filter((r) => matches(r, where ?? {}))
        .map(clone),
    count: async ({ where }: { where?: Row } = {}) =>
      store().filter((r) => matches(r, where ?? {})).length,
    create: async ({ data }: { data: Row }) => {
      const { inquiries, ...rest } = data as Row & {
        inquiries?: { createMany: { data: Row[] } };
      };
      const row: Row = { id: nextId("row"), ...rest };
      store().push(row);
      for (const q of inquiries?.createMany.data ?? []) {
        db.inquiries.push({ id: nextId("q"), footfallEntryId: row.id, ...q });
      }
      return {
        ...clone(row),
        inquiries: db.inquiries.filter((q) => q.footfallEntryId === row.id).map(clone),
      };
    },
    upsert: async ({ where, update, create }: { where: Row; update: Row; create: Row }) => {
      const nested = Object.values(where).find(
        (v) => v && typeof v === "object" && !(v instanceof Date),
      ) as Row | undefined;
      const criteria = nested ?? where;
      const existing = store().find((r) => matches(r, criteria));
      if (existing) {
        Object.assign(existing, update);
        return clone(existing);
      }
      const row: Row = { id: nextId("row"), ...create };
      store().push(row);
      return clone(row);
    },
    aggregate: async ({ where, _sum }: { where?: Row; _sum?: Row }) => {
      const rows = store().filter((r) => matches(r, where ?? {}));
      const out: Row = {};
      for (const f of Object.keys(_sum ?? {})) {
        out[f] = rows.length
          ? rows.reduce((s, r) => s + ((r[f] as number) ?? 0), 0)
          : null;
      }
      return { _sum: out };
    },
    groupBy: async ({ by, where }: { by: string[]; where?: Row }) => {
      const rows = store().filter((r) => matches(r, where ?? {}));
      const key = by[0];
      const groups = new Map<string, Row[]>();
      for (const r of rows) {
        const k = String(r[key]);
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      return [...groups].map(([k, rs]) => ({
        [key]: k,
        _sum: {
          amountNpr: rs.reduce((s, r) => s + ((r.amountNpr as number) ?? 0), 0),
          results: rs.reduce((s, r) => s + ((r.results as number) ?? 0), 0),
        },
      }));
    },
  };
}

const client = {
  footfallEntry: model(() => db.footfall),
  footfallInquiry: model(() => db.inquiries),
  socialMetricsMonthly: model(() => db.social),
  contentLog: model(() => db.content),
  adSpendDaily: model(() => db.adSpend),
  showroom: model(() => db.showrooms),
  staff: model(() => db.staff),
  sale: model(() => db.sales),
  productVariation: model(() => db.variations),
};

vi.mock("@/lib/db", () => ({
  prisma: {
    ...client,
    $transaction: async (fn: (tx: typeof client) => unknown) => fn(client),
  },
}));

const {
  toNpr,
  recordFootfall,
  addFootfallInquiry,
  listFootfall,
  upsertSocialMetrics,
  listSocialMetrics,
  appendContentLog,
  recordAdSpend,
  listAdSpend,
  importAdSpendCsv,
  importSocialMetricsCsv,
} = await import("@/lib/marketing");
const { CmsError } = await import("@/lib/cms/errors");

const STAFF = "staff_sanu";
const ROOM = "thamel";
const VAR = "var_small";

beforeEach(() => {
  db.footfall = [];
  db.inquiries = [];
  db.social = [];
  db.content = [];
  db.adSpend = [];
  db.showrooms = [
    { key: ROOM, type: "showroom", active: true },
    { key: "gongabu", type: "showroom", active: true },
  ];
  db.staff = [{ id: STAFF, name: "Sanu", active: true }];
  db.sales = [];
  db.variations = [{ id: VAR, sku: "SB-1-S", label: "Small" }];
  db.seq = 0;
});

describe("toNpr — the conversion that decides whether a spend report is real", () => {
  it("converts and rounds to whole rupees", () => {
    // 100 AUD at 89.5 → 8,950 NPR.
    expect(toNpr(100, 89.5)).toBe(8950);
    // Rounds rather than truncating: 10.005 × 89.5 = 895.4475 → 895.
    expect(toNpr(10.005, 89.5)).toBe(895);
    expect(toNpr(0.5, 3)).toBe(2); // 1.5 → 2, round-half-up
  });

  it("is a no-op at rate 1 for money already in NPR", () => {
    expect(toNpr(4500, 1)).toBe(4500);
  });

  it("refuses a missing, zero or negative rate instead of defaulting to 1", () => {
    // Defaulting to 1 would file an AUD number as NPR — ~90× too small.
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => toNpr(100, bad)).toThrow(CmsError);
    }
    // @ts-expect-error — absent rate, the shape a bad CSV produces
    expect(() => toNpr(100, undefined)).toThrow(/fxRate/i);
  });

  it("refuses a negative or non-finite amount", () => {
    expect(() => toNpr(-5, 89.5)).toThrow(CmsError);
    expect(() => toNpr(Number.NaN, 89.5)).toThrow(CmsError);
  });
});

describe("recordAdSpend", () => {
  const spend = (over: Partial<Parameters<typeof recordAdSpend>[0]> = {}) =>
    recordAdSpend(
      {
        dateAd: new Date("2026-08-09T00:00:00Z"),
        platform: "facebook",
        campaignName: "Shrawan push",
        amountSpent: 100,
        currency: "AUD",
        fxRate: 89.5,
        results: 20,
        ...over,
      },
      STAFF,
    );

  it("keeps the original amount, currency and rate alongside the NPR figure", async () => {
    const row = await spend();
    expect(Number(row.amountSpent)).toBe(100);
    expect(row.currency).toBe("AUD");
    expect(Number(row.fxRate)).toBe(89.5);
    expect(row.amountNpr).toBe(8950);
    // Both calendars, like every other reporting row.
    expect(row.dateBs).toBe("2083-04-24");
    expect(row.source).toBe("manual");
  });

  it("normalises the currency code and rejects a malformed one", async () => {
    const row = await spend({ currency: " aud " });
    expect(row.currency).toBe("AUD");
    for (const bad of ["A", "AUDD", "australian", ""]) {
      await expect(spend({ currency: bad })).rejects.toThrow(/three-letter code/i);
    }
  });

  it("refuses a row with no usable FX rate", async () => {
    await expect(spend({ fxRate: 0 })).rejects.toThrow(/fxRate/i);
  });

  it("rejects an unknown platform", async () => {
    await expect(spend({ platform: "billboard" as never })).rejects.toThrow(CmsError);
  });

  it("corrects a re-filed day rather than duplicating it", async () => {
    await spend({ amountSpent: 100 });
    await spend({ amountSpent: 250 });
    expect(db.adSpend).toHaveLength(1);
    expect(Number(db.adSpend[0].amountSpent)).toBe(250);
    expect(db.adSpend[0].amountNpr).toBe(Math.round(250 * 89.5));
  });

  it("dedupes rows with no campaign, using an empty-string sentinel", async () => {
    // A NULL member of a compound unique key is distinct in Postgres, so
    // campaign-less rows would never dedupe — and Prisma refuses null in the
    // upsert key outright. Only a real database surfaced this.
    await spend({ campaignName: null, amountSpent: 10 });
    await spend({ campaignName: null, amountSpent: 30 });
    expect(db.adSpend).toHaveLength(1);
    expect(db.adSpend[0].campaignName).toBe("");
    expect(Number(db.adSpend[0].amountSpent)).toBe(30);

    // …and the sentinel is never shown to callers.
    const { spend: rows } = await listAdSpend({});
    expect(rows[0].campaignName).toBeNull();
  });

  it("keys a day by its date, not the time it was filed at", async () => {
    // A CSV whose dates carry a time would otherwise land as several rows for
    // one day, quietly multiplying the reported spend.
    await spend({ dateAd: new Date("2026-08-09T00:00:00Z"), amountSpent: 100 });
    await spend({ dateAd: new Date("2026-08-09T17:45:00Z"), amountSpent: 300 });
    expect(db.adSpend).toHaveLength(1);
    expect(Number(db.adSpend[0].amountSpent)).toBe(300);
    expect(new Date(db.adSpend[0].dateAd as string).toISOString()).toBe(
      "2026-08-09T00:00:00.000Z",
    );
  });
});

describe("listAdSpend", () => {
  it("sums only the NPR column and derives a blended cost per result", async () => {
    await recordAdSpend(
      { dateAd: new Date("2026-08-01"), platform: "facebook", amountSpent: 100, currency: "AUD", fxRate: 90, results: 10 },
      STAFF,
    );
    await recordAdSpend(
      { dateAd: new Date("2026-08-02"), platform: "instagram", amountSpent: 4500, currency: "NPR", fxRate: 1, results: 5 },
      STAFF,
    );

    const r = await listAdSpend({});
    // 9000 + 4500 — adding AUD to NPR would be meaningless, which is why the
    // NPR column is materialized.
    expect(r.totalNpr).toBe(13500);
    expect(r.totalResults).toBe(15);
    expect(r.costPerResultNpr).toBe(900);
    expect(r.byPlatform.find((p) => p.platform === "facebook")?.amountNpr).toBe(9000);
    // Decimals come back as numbers, not Prisma objects.
    expect(typeof r.spend[0].amountSpent).toBe("number");
  });

  it("reports null cost per result when nothing was attributed", async () => {
    await recordAdSpend(
      { dateAd: new Date("2026-08-01"), platform: "google", amountSpent: 10, currency: "AUD", fxRate: 90 },
      STAFF,
    );
    expect((await listAdSpend({})).costPerResultNpr).toBeNull();
  });
});

describe("importAdSpendCsv", () => {
  const header =
    "date,platform,campaign,amountSpent,currency,fxRate,impressions,results";

  it("imports clean rows and tolerates real sheet formatting", async () => {
    const csv = [
      header,
      "2026-08-01,facebook,Shrawan,100.50,AUD,89.5,1200,10",
      // What Sheets and the Meta export actually emit: a quoted amount with a
      // thousands separator, and a campaign name containing a comma.
      '2026-08-02,instagram,"Shrawan, phase 2","1,200",AUD,89.5,2400,20',
    ].join("\n");
    const r = await importAdSpendCsv(csv, STAFF);
    expect(r.imported).toBe(2);
    expect(r.skipped).toEqual([]);
    expect(db.adSpend[0].amountNpr).toBe(Math.round(100.5 * 89.5));
    // The comma inside quotes stayed inside the field rather than splitting it.
    const second = db.adSpend[1];
    expect(second.campaignName).toBe("Shrawan, phase 2");
    expect(Number(second.amountSpent)).toBe(1200);
    expect(second.amountNpr).toBe(Math.round(1200 * 89.5));
    expect(db.adSpend.every((s) => s.source === "csv_import")).toBe(true);
  });

  it("SKIPS a row with no FX rate and says why, rather than assuming 1", async () => {
    const csv = [header, "2026-08-01,facebook,X,100,AUD,,1200,10"].join("\n");
    const r = await importAdSpendCsv(csv, STAFF);
    expect(r.imported).toBe(0);
    expect(r.skipped[0]).toMatch(/fxRate/i);
    expect(r.skipped[0]).toMatch(/AUD/);
    // Nothing filed, so no report can quote a 90×-wrong figure.
    expect(db.adSpend).toHaveLength(0);
  });

  it("skips unreadable dates, unknown platforms and bad currencies, importing the rest", async () => {
    const csv = [
      header,
      "not-a-date,facebook,X,100,AUD,89.5,1,1",
      "2026-08-01,billboard,X,100,AUD,89.5,1,1",
      "2026-08-01,facebook,X,100,AUSTRALIAN,89.5,1,1",
      "2026-08-03,facebook,Good,100,AUD,89.5,1,1",
    ].join("\n");
    const r = await importAdSpendCsv(csv, STAFF);
    expect(r.imported).toBe(1);
    expect(r.skipped).toHaveLength(3);
    expect(r.skipped.join(" ")).toMatch(/unreadable date/);
    expect(r.skipped.join(" ")).toMatch(/unknown platform/);
    expect(r.skipped.join(" ")).toMatch(/3-letter code/);
  });

  it("rejects a CSV with no data rows or missing required columns", async () => {
    await expect(importAdSpendCsv(header, STAFF)).rejects.toThrow(/no data rows/i);
    await expect(
      importAdSpendCsv("foo,bar\n1,2", STAFF),
    ).rejects.toThrow(/"date" and "platform"/);
  });
});

describe("social metrics", () => {
  it("keeps one row per month per platform, correcting a re-filing", async () => {
    const aug = new Date("2026-08-09T00:00:00Z");
    await upsertSocialMetrics({ periodAd: aug, platform: "instagram", followers: 5000 });
    // A different day in the same month must not create a second period.
    await upsertSocialMetrics({
      periodAd: new Date("2026-08-28T00:00:00Z"),
      platform: "instagram",
      followers: 5200,
    });
    expect(db.social).toHaveLength(1);
    expect(db.social[0].followers).toBe(5200);
    // Filed under the Nepali month, with periodAd normalised to the 1st.
    expect(db.social[0].periodBs).toBe("2083-04");
    expect(new Date(db.social[0].periodAd as string).getUTCDate()).toBe(1);
  });

  it("separates platforms within a month", async () => {
    const aug = new Date("2026-08-09T00:00:00Z");
    await upsertSocialMetrics({ periodAd: aug, platform: "instagram", followers: 1 });
    await upsertSocialMetrics({ periodAd: aug, platform: "tiktok", followers: 2 });
    expect(db.social).toHaveLength(2);
  });

  it("keeps engagement rate fractional and serialises it as a number", async () => {
    await upsertSocialMetrics({
      periodAd: new Date("2026-08-09T00:00:00Z"),
      platform: "facebook",
      engagementRate: 5.25,
    });
    const { metrics } = await listSocialMetrics({});
    expect(metrics[0].engagementRate).toBe(5.25);
  });

  it("rejects an unknown platform or source", async () => {
    const aug = new Date("2026-08-09T00:00:00Z");
    await expect(
      upsertSocialMetrics({ periodAd: aug, platform: "myspace" as never }),
    ).rejects.toThrow(CmsError);
    await expect(
      upsertSocialMetrics({ periodAd: aug, platform: "facebook", source: "vibes" as never }),
    ).rejects.toThrow(CmsError);
  });

  it("imports a monthly sheet and reports unusable rows", async () => {
    const csv = [
      "period,platform,followers,engagementRate",
      "2026-08-09,instagram,5000,5.25",
      "2026-08-09,myspace,10,1",
      "nope,facebook,10,1",
    ].join("\n");
    const r = await importSocialMetricsCsv(csv);
    expect(r.imported).toBe(1);
    expect(r.skipped).toHaveLength(2);
    expect(db.social[0].source).toBe("csv_import");
  });
});

describe("footfall", () => {
  const entry = (over: Partial<Parameters<typeof recordFootfall>[0]> = {}) =>
    recordFootfall(
      { showroomKey: ROOM, visitorsTotal: 4, source: "walk_in", ...over },
      STAFF,
    );

  it("records an entry with both calendars and its inquiries in one go", async () => {
    const e = await entry({
      dateAd: new Date("2026-08-09T06:00:00Z"),
      individuals: 2,
      groups: 1,
      inquiries: [
        { variationId: VAR, inquiryType: "inquired" },
        { freeTextProduct: "big brass bowl", inquiryType: "sold" },
      ],
    });
    expect(e.dateBs).toBe("2083-04-24");
    expect(e.visitorsTotal).toBe(4);
    // Multi-product days become inquiry rows against one entry, replacing the
    // old blank-date continuation rows.
    expect(e.inquiries).toHaveLength(2);
    expect(e.inquiries[1].freeTextProduct).toBe("big brass bowl");
  });

  it("does not force individuals + groups to equal the total", async () => {
    // Real sheets recorded one without the other; refusing that would push the
    // data back into a notebook.
    const e = await entry({ visitorsTotal: 10, individuals: 3, groups: null });
    expect(e.visitorsTotal).toBe(10);
    expect(e.individuals).toBe(3);
    expect(e.groups).toBeNull();
  });

  it("accepts a free-text product but not a nameless inquiry", async () => {
    await expect(
      entry({ inquiries: [{ inquiryType: "inquired" }] }),
    ).rejects.toThrow(/either a product variation or a free-text/i);
  });

  it("marks conversion automatically when a sale is linked", async () => {
    db.sales.push({ id: "s1", status: "confirmed" });
    const e = await entry({ linkedSaleId: "s1" });
    expect(e.convertedToSale).toBe(true);
  });

  it("refuses to count a draft sale as a conversion", async () => {
    db.sales.push({ id: "s_draft", status: "draft" });
    await expect(entry({ linkedSaleId: "s_draft" })).rejects.toThrow(/still a draft/i);
  });

  it("rejects unknown showroom, staff, source, variation or negative counts", async () => {
    await expect(entry({ showroomKey: "pokhara" })).rejects.toThrow(CmsError);
    await expect(
      recordFootfall({ showroomKey: ROOM, visitorsTotal: 1, source: "walk_in" }, "ghost"),
    ).rejects.toThrow(CmsError);
    await expect(entry({ source: "teleport" as never })).rejects.toThrow(CmsError);
    await expect(entry({ visitorsTotal: -1 })).rejects.toThrow(CmsError);
    await expect(entry({ individuals: 1.5 })).rejects.toThrow(CmsError);
    await expect(
      entry({ inquiries: [{ variationId: "ghost", inquiryType: "sold" }] }),
    ).rejects.toThrow(CmsError);
  });

  it("appends an inquiry to an existing entry", async () => {
    const e = await entry();
    await addFootfallInquiry({
      footfallEntryId: e.id as string,
      inquiry: { variationId: VAR, inquiryType: "sold" },
    });
    expect(db.inquiries).toHaveLength(1);
    await expect(
      addFootfallInquiry({
        footfallEntryId: "ghost",
        inquiry: { variationId: VAR, inquiryType: "sold" },
      }),
    ).rejects.toThrow(CmsError);
  });

  it("derives visitor totals and a conversion rate", async () => {
    db.sales.push({ id: "s1", status: "confirmed" });
    await entry({ visitorsTotal: 6 });
    await entry({ visitorsTotal: 4, linkedSaleId: "s1" });

    const r = await listFootfall({});
    expect(r.total).toBe(2);
    expect(r.visitorsTotal).toBe(10);
    expect(r.convertedEntries).toBe(1);
    // Entry-based: a group of four is one entry and at most one conversion.
    expect(r.conversionRate).toBe(50);
  });

  it("filters by showroom, source and conversion", async () => {
    await entry({ showroomKey: ROOM, source: "walk_in" });
    await entry({ showroomKey: "gongabu", source: "ad" });
    expect((await listFootfall({ showroomKey: "gongabu" })).total).toBe(1);
    expect((await listFootfall({ source: "ad" })).total).toBe(1);
    expect((await listFootfall({ convertedToSale: true })).total).toBe(0);
  });
});

describe("content log", () => {
  it("appends a row with both calendars and a numeric engagement rate", async () => {
    const row = await appendContentLog(
      {
        date: new Date("2026-08-09T06:00:00Z"),
        platform: "instagram",
        contentType: "reel",
        topic: "singing bowl close-up",
        engagementRate: 7.5,
        likes: 120,
      },
      STAFF,
    );
    expect(row.dateBs).toBe("2083-04-24");
    expect(Number(row.engagementRate)).toBe(7.5);
    expect(row.source).toBe("manual");
  });

  it("rejects an unknown platform", async () => {
    await expect(
      appendContentLog({ platform: "myspace" as never, contentType: "post" }, STAFF),
    ).rejects.toThrow(CmsError);
  });
});
