// Marketing & footfall service (spec Module D).
//
// The one genuinely dangerous thing in this module is currency. The Meta ad
// export is denominated in AUD, so every spend row keeps its original amount,
// its currency, and the rate used, and the NPR figure reports read is
// materialized from those at write time. A stored-only-converted number would
// make the conversion unauditable, and a missing rate would silently produce
// NPR figures that are really AUD — off by roughly 90×.
//
// The rest replaces hand-kept surfaces: footfall (whose multi-product days used
// to spill onto blank-date continuation rows — now inquiry rows against one
// entry), the monthly social tally, and the content log.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { adToBs, bsPeriod } from "@/lib/dates";
import {
  AD_PLATFORMS,
  CURRENCY_RE,
  FOOTFALL_SOURCES,
  INQUIRY_TYPES,
  METRIC_SOURCES,
  SOCIAL_PLATFORMS,
  type AdPlatform,
  type FootfallSource,
  type InquiryType,
  type MetricSource,
  type SocialPlatform,
} from "./constants";

const MAX_PAGE_SIZE = 500;

/** Decimal → number for JSON responses; Prisma Decimals don't serialize. */
function dec(v: Prisma.Decimal | null): number | null {
  return v === null ? null : Number(v);
}

/**
 * Collapse an instant to UTC midnight of its day.
 *
 * Ad spend is a DAILY figure, and its uniqueness key is (day, platform,
 * campaign). Without this, a CSV whose dates carry a time — or two imports that
 * parse the same date differently — would land as several rows for one day
 * instead of correcting one, quietly multiplying the reported spend.
 */
function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * NPR value of a foreign-currency amount, rounded to whole rupees.
 *
 * Exported and tested directly because this is the calculation that turns a
 * plausible-looking spend report into a wrong one.
 */
export function toNpr(amountSpent: number, fxRate: number): number {
  if (!Number.isFinite(amountSpent) || amountSpent < 0) {
    throw new CmsError("amountSpent must be a non-negative number", {
      statusCode: 400,
    });
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    throw new CmsError(
      "fxRate must be greater than zero — without it the NPR figure would silently be a foreign-currency number",
      { statusCode: 400, referenceKind: "fxRate" },
    );
  }
  return Math.round(amountSpent * fxRate);
}

// ─── Footfall ────────────────────────────────────────────────────────────────

export interface FootfallInquiryInput {
  variationId?: string | null;
  freeTextProduct?: string | null;
  inquiryType: InquiryType;
}

export interface RecordFootfallInput {
  showroomKey: string;
  dateAd?: Date;
  visitorsTotal: number;
  individuals?: number | null;
  groups?: number | null;
  source: FootfallSource;
  convertedToSale?: boolean;
  linkedSaleId?: string | null;
  notes?: string | null;
  inquiries?: FootfallInquiryInput[];
}

export async function recordFootfall(
  input: RecordFootfallInput,
  enteredByStaffId: string,
) {
  if (!FOOTFALL_SOURCES.includes(input.source)) {
    throw new CmsError(`Unknown footfall source "${input.source}"`, {
      statusCode: 400,
      availableOptions: [...FOOTFALL_SOURCES],
      referenceKind: "source",
    });
  }
  if (!Number.isInteger(input.visitorsTotal) || input.visitorsTotal < 0) {
    throw new CmsError("visitorsTotal must be a whole number of visitors", {
      statusCode: 400,
    });
  }
  for (const [field, value] of [
    ["individuals", input.individuals],
    ["groups", input.groups],
  ] as const) {
    if (value != null && (!Number.isInteger(value) || value < 0)) {
      throw new CmsError(`${field} must be a whole number when given`, {
        statusCode: 400,
      });
    }
  }

  return prisma.$transaction(async (tx) => {
    const showroom = await tx.showroom.findUnique({
      where: { key: input.showroomKey },
      select: { key: true },
    });
    if (!showroom) {
      const keys = await tx.showroom.findMany({ select: { key: true } });
      throw new CmsError("Showroom not found", {
        statusCode: 404,
        availableOptions: keys.map((s) => s.key),
        referenceKind: "showroomKey",
      });
    }
    const staff = await tx.staff.findUnique({
      where: { id: enteredByStaffId },
      select: { id: true },
    });
    if (!staff) {
      throw new CmsError(`Staff member "${enteredByStaffId}" not found`, {
        statusCode: 404,
        referenceKind: "enteredByStaffId",
      });
    }
    if (input.linkedSaleId) {
      const sale = await tx.sale.findUnique({
        where: { id: input.linkedSaleId },
        select: { id: true, status: true },
      });
      if (!sale) {
        throw new CmsError("Sale not found", {
          statusCode: 404,
          referenceKind: "linkedSaleId",
        });
      }
      // A draft isn't a sale yet; counting it as a conversion would overstate.
      if (sale.status === "draft") {
        throw new CmsError(
          "That sale is still a draft — confirm it before recording it as a conversion",
          { statusCode: 409, referenceKind: "linkedSaleId" },
        );
      }
    }

    const inquiries = input.inquiries ?? [];
    for (const q of inquiries) {
      if (!INQUIRY_TYPES.includes(q.inquiryType)) {
        throw new CmsError(`Unknown inquiry type "${q.inquiryType}"`, {
          statusCode: 400,
          availableOptions: [...INQUIRY_TYPES],
          referenceKind: "inquiryType",
        });
      }
      if (!q.variationId && !q.freeTextProduct?.trim()) {
        throw new CmsError(
          "An inquiry needs either a product variation or a free-text product name",
          { statusCode: 400 },
        );
      }
      if (q.variationId) {
        const variation = await tx.productVariation.findUnique({
          where: { id: q.variationId },
          select: { id: true },
        });
        if (!variation) {
          throw new CmsError(`No variation with id "${q.variationId}"`, {
            statusCode: 404,
            referenceKind: "variationId",
          });
        }
      }
    }

    const dateAd = input.dateAd ?? new Date();
    return tx.footfallEntry.create({
      data: {
        dateAd,
        dateBs: adToBs(dateAd),
        showroomKey: input.showroomKey,
        visitorsTotal: input.visitorsTotal,
        individuals: input.individuals ?? null,
        groups: input.groups ?? null,
        source: input.source,
        convertedToSale: input.convertedToSale ?? !!input.linkedSaleId,
        linkedSaleId: input.linkedSaleId ?? null,
        enteredByStaffId,
        notes: input.notes ?? null,
        ...(inquiries.length
          ? {
              inquiries: {
                createMany: {
                  data: inquiries.map((q) => ({
                    variationId: q.variationId ?? null,
                    freeTextProduct: q.freeTextProduct?.trim() || null,
                    inquiryType: q.inquiryType,
                  })),
                },
              },
            }
          : {}),
      },
      include: { inquiries: true },
    });
  });
}

/** Add an inquiry to an existing entry — the old continuation-row case. */
export async function addFootfallInquiry(input: {
  footfallEntryId: string;
  inquiry: FootfallInquiryInput;
}) {
  const q = input.inquiry;
  if (!INQUIRY_TYPES.includes(q.inquiryType)) {
    throw new CmsError(`Unknown inquiry type "${q.inquiryType}"`, {
      statusCode: 400,
      availableOptions: [...INQUIRY_TYPES],
      referenceKind: "inquiryType",
    });
  }
  if (!q.variationId && !q.freeTextProduct?.trim()) {
    throw new CmsError(
      "An inquiry needs either a product variation or a free-text product name",
      { statusCode: 400 },
    );
  }
  const entry = await prisma.footfallEntry.findUnique({
    where: { id: input.footfallEntryId },
    select: { id: true },
  });
  if (!entry) {
    throw new CmsError("Footfall entry not found", { statusCode: 404 });
  }
  return prisma.footfallInquiry.create({
    data: {
      footfallEntryId: entry.id,
      variationId: q.variationId ?? null,
      freeTextProduct: q.freeTextProduct?.trim() || null,
      inquiryType: q.inquiryType,
    },
  });
}

export interface FootfallFilters {
  showroomKey?: string;
  source?: FootfallSource;
  convertedToSale?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export async function listFootfall(filters: FootfallFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.FootfallEntryWhereInput = {
    ...(filters.showroomKey ? { showroomKey: filters.showroomKey } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.convertedToSale !== undefined
      ? { convertedToSale: filters.convertedToSale }
      : {}),
    ...(filters.from || filters.to
      ? {
          dateAd: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, entries, visitors, converted] = await Promise.all([
    prisma.footfallEntry.count({ where }),
    prisma.footfallEntry.findMany({
      where,
      orderBy: { dateAd: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        showroom: { select: { key: true, name: true } },
        enteredByStaff: { select: { id: true, name: true } },
        inquiries: {
          include: {
            variation: {
              select: {
                sku: true,
                label: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    // Period totals, derived — the figure a monthly report wants.
    prisma.footfallEntry.aggregate({ where, _sum: { visitorsTotal: true } }),
    prisma.footfallEntry.count({ where: { ...where, convertedToSale: true } }),
  ]);
  const visitorsTotal = visitors._sum.visitorsTotal ?? 0;
  return {
    entries,
    total,
    page,
    limit,
    visitorsTotal,
    convertedEntries: converted,
    // Share of recorded entries that turned into a sale. Entry-based, not
    // visitor-based: a group of four is one entry and at most one conversion.
    conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
  };
}

// ─── Social metrics ──────────────────────────────────────────────────────────

export interface SocialMetricsInput {
  periodBs?: string;
  periodAd: Date;
  platform: SocialPlatform;
  followers?: number | null;
  newFollowers?: number | null;
  posts?: number | null;
  stories?: number | null;
  reels?: number | null;
  reach?: number | null;
  impressions?: number | null;
  profileVisits?: number | null;
  avgLikes?: number | null;
  avgComments?: number | null;
  avgSharesSaves?: number | null;
  engagementRate?: number | null;
  source?: MetricSource;
}

/**
 * One row per month per platform. Upsert, not insert: re-filing a month
 * corrects it instead of leaving two versions of the same truth.
 */
export async function upsertSocialMetrics(input: SocialMetricsInput) {
  if (!SOCIAL_PLATFORMS.includes(input.platform)) {
    throw new CmsError(`Unknown platform "${input.platform}"`, {
      statusCode: 400,
      availableOptions: [...SOCIAL_PLATFORMS],
      referenceKind: "platform",
    });
  }
  const source = input.source ?? "manual";
  if (!METRIC_SOURCES.includes(source)) {
    throw new CmsError(`Unknown source "${source}"`, {
      statusCode: 400,
      availableOptions: [...METRIC_SOURCES],
      referenceKind: "source",
    });
  }
  // Normalise to the first of the month so a mid-month filing doesn't create a
  // second period.
  const periodAd = new Date(
    Date.UTC(input.periodAd.getUTCFullYear(), input.periodAd.getUTCMonth(), 1),
  );
  const periodBs = input.periodBs ?? bsPeriod(periodAd);

  const data = {
    periodAd,
    followers: input.followers ?? null,
    newFollowers: input.newFollowers ?? null,
    posts: input.posts ?? null,
    stories: input.stories ?? null,
    reels: input.reels ?? null,
    reach: input.reach ?? null,
    impressions: input.impressions ?? null,
    profileVisits: input.profileVisits ?? null,
    avgLikes: input.avgLikes ?? null,
    avgComments: input.avgComments ?? null,
    avgSharesSaves: input.avgSharesSaves ?? null,
    engagementRate:
      input.engagementRate == null
        ? null
        : new Prisma.Decimal(input.engagementRate),
    source,
  };

  return prisma.socialMetricsMonthly.upsert({
    where: { periodBs_platform: { periodBs, platform: input.platform } },
    update: data,
    create: { periodBs, platform: input.platform, ...data },
  });
}

export async function listSocialMetrics(filters: {
  platform?: SocialPlatform;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.SocialMetricsMonthlyWhereInput = {
    ...(filters.platform ? { platform: filters.platform } : {}),
    ...(filters.from || filters.to
      ? {
          periodAd: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.socialMetricsMonthly.count({ where }),
    prisma.socialMetricsMonthly.findMany({
      where,
      orderBy: [{ periodAd: "desc" }, { platform: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    metrics: rows.map((r) => ({ ...r, engagementRate: dec(r.engagementRate) })),
    total,
    page,
    limit,
  };
}

// ─── Content log ─────────────────────────────────────────────────────────────

export interface ContentLogInput {
  date?: Date;
  platform: SocialPlatform;
  contentType: string;
  topic?: string | null;
  hashtags?: string | null;
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  engagementRate?: number | null;
  linkClicks?: number | null;
  notes?: string | null;
  source?: "manual" | "csv_import";
}

export async function appendContentLog(
  input: ContentLogInput,
  enteredByStaffId: string | null,
) {
  if (!SOCIAL_PLATFORMS.includes(input.platform)) {
    throw new CmsError(`Unknown platform "${input.platform}"`, {
      statusCode: 400,
      availableOptions: [...SOCIAL_PLATFORMS],
      referenceKind: "platform",
    });
  }
  const date = input.date ?? new Date();
  return prisma.contentLog.create({
    data: {
      date,
      dateBs: adToBs(date),
      platform: input.platform,
      contentType: input.contentType,
      topic: input.topic ?? null,
      hashtags: input.hashtags ?? null,
      reach: input.reach ?? null,
      impressions: input.impressions ?? null,
      likes: input.likes ?? null,
      comments: input.comments ?? null,
      shares: input.shares ?? null,
      saves: input.saves ?? null,
      engagementRate:
        input.engagementRate == null
          ? null
          : new Prisma.Decimal(input.engagementRate),
      linkClicks: input.linkClicks ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
      enteredByStaffId,
    },
  });
}

export async function listContentLog(filters: {
  platform?: SocialPlatform;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.ContentLogWhereInput = {
    ...(filters.platform ? { platform: filters.platform } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.contentLog.count({ where }),
    prisma.contentLog.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { enteredByStaff: { select: { id: true, name: true } } },
    }),
  ]);
  return {
    entries: rows.map((r) => ({ ...r, engagementRate: dec(r.engagementRate) })),
    total,
    page,
    limit,
  };
}

// ─── Ad spend ────────────────────────────────────────────────────────────────

export interface AdSpendInput {
  dateAd: Date;
  platform: AdPlatform;
  campaignName?: string | null;
  amountSpent: number;
  currency: string;
  fxRate: number;
  impressions?: number | null;
  reach?: number | null;
  frequency?: number | null;
  results?: number | null;
  costPerResult?: number | null;
  messagingConversations?: number | null;
  source?: MetricSource;
}

/**
 * Record a day's spend for one campaign. Upsert on (date, platform, campaign)
 * so a re-import corrects rather than duplicates.
 */
export async function recordAdSpend(
  input: AdSpendInput,
  enteredByStaffId: string | null,
) {
  if (!AD_PLATFORMS.includes(input.platform)) {
    throw new CmsError(`Unknown ad platform "${input.platform}"`, {
      statusCode: 400,
      availableOptions: [...AD_PLATFORMS],
      referenceKind: "platform",
    });
  }
  const currency = input.currency?.trim().toUpperCase() ?? "";
  if (!CURRENCY_RE.test(currency)) {
    throw new CmsError(
      `Currency must be a three-letter code (got "${input.currency}") — the Meta export is in AUD`,
      { statusCode: 400, referenceKind: "currency" },
    );
  }
  // toNpr does the guarding: a zero or missing rate would turn an AUD number
  // into an "NPR" figure roughly 90× too small.
  const amountNpr = toNpr(input.amountSpent, input.fxRate);
  const source = input.source ?? "manual";
  if (!METRIC_SOURCES.includes(source)) {
    throw new CmsError(`Unknown source "${source}"`, {
      statusCode: 400,
      availableOptions: [...METRIC_SOURCES],
      referenceKind: "source",
    });
  }

  // Empty string is the "no campaign" sentinel — see the schema note: a NULL
  // member of the compound unique key would never dedupe.
  const campaignName = input.campaignName?.trim() || "";
  const dateAd = startOfDayUtc(input.dateAd);
  const data = {
    dateBs: adToBs(dateAd),
    amountSpent: new Prisma.Decimal(input.amountSpent),
    currency,
    fxRate: new Prisma.Decimal(input.fxRate),
    amountNpr,
    impressions: input.impressions ?? null,
    reach: input.reach ?? null,
    frequency:
      input.frequency == null ? null : new Prisma.Decimal(input.frequency),
    results: input.results ?? null,
    costPerResult:
      input.costPerResult == null
        ? null
        : new Prisma.Decimal(input.costPerResult),
    messagingConversations: input.messagingConversations ?? null,
    source,
    enteredByStaffId,
  };

  return prisma.adSpendDaily.upsert({
    where: {
      dateAd_platform_campaignName: {
        dateAd,
        platform: input.platform,
        campaignName,
      },
    },
    update: data,
    create: { dateAd, platform: input.platform, campaignName, ...data },
  });
}

export async function listAdSpend(filters: {
  platform?: AdPlatform;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.AdSpendDailyWhereInput = {
    ...(filters.platform ? { platform: filters.platform } : {}),
    ...(filters.from || filters.to
      ? {
          dateAd: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, rows, spend, byPlatform] = await Promise.all([
    prisma.adSpendDaily.count({ where }),
    prisma.adSpendDaily.findMany({
      where,
      orderBy: { dateAd: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { enteredByStaff: { select: { id: true, name: true } } },
    }),
    // Only the NPR column is summed: adding AUD to NPR would be meaningless,
    // which is exactly why amountNpr is materialized.
    prisma.adSpendDaily.aggregate({
      where,
      _sum: { amountNpr: true, results: true },
    }),
    prisma.adSpendDaily.groupBy({
      by: ["platform"],
      where,
      _sum: { amountNpr: true, results: true },
    }),
  ]);
  const totalNpr = spend._sum.amountNpr ?? 0;
  const totalResults = spend._sum.results ?? 0;
  return {
    spend: rows.map((r) => ({
      ...r,
      campaignName: r.campaignName || null,
      amountSpent: dec(r.amountSpent),
      fxRate: dec(r.fxRate),
      frequency: dec(r.frequency),
      costPerResult: dec(r.costPerResult),
    })),
    total,
    page,
    limit,
    totalNpr,
    totalResults,
    // Blended cost per result, in NPR. Null rather than Infinity when nothing
    // was attributed.
    costPerResultNpr:
      totalResults > 0 ? Math.round(totalNpr / totalResults) : null,
    byPlatform: byPlatform.map((p) => ({
      platform: p.platform,
      amountNpr: p._sum.amountNpr ?? 0,
      results: p._sum.results ?? 0,
    })),
  };
}

// ─── CSV import ──────────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: string[];
}

/**
 * Split one CSV line, respecting quoted fields.
 *
 * Sheet and Meta exports routinely emit `"1,200"` and `"Campaign, Summer"`, so
 * a naive split on commas mangles exactly the rows the business actually has.
 * Doubled quotes inside a quoted field ("" → ") are unescaped.
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++; // consume the escaped pair
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function splitCsv(raw: string): string[][] {
  return raw
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map(splitCsvLine);
}

const num = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  // Sheets export thousands separators and currency symbols; strip them rather
  // than importing NaN.
  const cleaned = v.replace(/[, ]/g, "").replace(/^[A-Za-z$₨]+/, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const int = (v: string | undefined): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

/**
 * Import the Meta ad export. Header (case-insensitive):
 *   date,platform,campaign,amountSpent,currency,fxRate,impressions,reach,frequency,results,costPerResult,messagingConversations
 *
 * A row without a usable fxRate is SKIPPED and reported, never defaulted to 1 —
 * a rate of 1 would file AUD numbers as NPR.
 */
export async function importAdSpendCsv(
  raw: string,
  enteredByStaffId: string | null,
): Promise<ImportResult> {
  const rows = splitCsv(raw);
  if (rows.length < 2) {
    throw new CmsError("CSV has no data rows", { statusCode: 400 });
  }
  const header = rows[0].map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("date");
  const iPlatform = col("platform");
  if (iDate < 0 || iPlatform < 0) {
    throw new CmsError(
      'CSV needs at least "date" and "platform" columns',
      { statusCode: 400 },
    );
  }

  const skipped: string[] = [];
  let imported = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const dateRaw = r[iDate];
    const date = dateRaw ? new Date(dateRaw) : null;
    if (!date || Number.isNaN(date.getTime())) {
      skipped.push(`line ${line}: unreadable date "${dateRaw}"`);
      continue;
    }
    const platform = r[iPlatform]?.toLowerCase() as AdPlatform;
    if (!AD_PLATFORMS.includes(platform)) {
      skipped.push(`line ${line}: unknown platform "${r[iPlatform]}"`);
      continue;
    }
    const amountSpent = num(r[col("amountspent")]);
    const fxRate = num(r[col("fxrate")]);
    const currency = (r[col("currency")] ?? "").trim().toUpperCase();
    if (amountSpent === null) {
      skipped.push(`line ${line}: unreadable amountSpent`);
      continue;
    }
    if (fxRate === null || fxRate <= 0) {
      skipped.push(
        `line ${line}: missing or zero fxRate — refusing to file ${currency || "foreign"} spend as NPR`,
      );
      continue;
    }
    if (!CURRENCY_RE.test(currency)) {
      skipped.push(`line ${line}: currency must be a 3-letter code, got "${currency}"`);
      continue;
    }

    try {
      await recordAdSpend(
        {
          dateAd: date,
          platform,
          campaignName: r[col("campaign")] ?? null,
          amountSpent,
          currency,
          fxRate,
          impressions: int(r[col("impressions")]),
          reach: int(r[col("reach")]),
          frequency: num(r[col("frequency")]),
          results: int(r[col("results")]),
          costPerResult: num(r[col("costperresult")]),
          messagingConversations: int(r[col("messagingconversations")]),
          source: "csv_import",
        },
        enteredByStaffId,
      );
      imported++;
    } catch (err) {
      skipped.push(
        `line ${line}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { imported, skipped };
}

/**
 * Import a monthly social-metrics sheet. Header (case-insensitive):
 *   period,platform,followers,newFollowers,posts,stories,reels,reach,
 *   impressions,profileVisits,avgLikes,avgComments,avgSharesSaves,engagementRate
 * `period` is an AD date in the month being reported (any day).
 */
export async function importSocialMetricsCsv(raw: string): Promise<ImportResult> {
  const rows = splitCsv(raw);
  if (rows.length < 2) {
    throw new CmsError("CSV has no data rows", { statusCode: 400 });
  }
  const header = rows[0].map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iPeriod = col("period");
  const iPlatform = col("platform");
  if (iPeriod < 0 || iPlatform < 0) {
    throw new CmsError('CSV needs at least "period" and "platform" columns', {
      statusCode: 400,
    });
  }

  const skipped: string[] = [];
  let imported = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const periodRaw = r[iPeriod];
    const periodAd = periodRaw ? new Date(periodRaw) : null;
    if (!periodAd || Number.isNaN(periodAd.getTime())) {
      skipped.push(`line ${line}: unreadable period "${periodRaw}"`);
      continue;
    }
    const platform = r[iPlatform]?.toLowerCase() as SocialPlatform;
    if (!SOCIAL_PLATFORMS.includes(platform)) {
      skipped.push(`line ${line}: unknown platform "${r[iPlatform]}"`);
      continue;
    }
    try {
      await upsertSocialMetrics({
        periodAd,
        platform,
        followers: int(r[col("followers")]),
        newFollowers: int(r[col("newfollowers")]),
        posts: int(r[col("posts")]),
        stories: int(r[col("stories")]),
        reels: int(r[col("reels")]),
        reach: int(r[col("reach")]),
        impressions: int(r[col("impressions")]),
        profileVisits: int(r[col("profilevisits")]),
        avgLikes: int(r[col("avglikes")]),
        avgComments: int(r[col("avgcomments")]),
        avgSharesSaves: int(r[col("avgsharessaves")]),
        engagementRate: num(r[col("engagementrate")]),
        source: "csv_import",
      });
      imported++;
    } catch (err) {
      skipped.push(
        `line ${line}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { imported, skipped };
}
