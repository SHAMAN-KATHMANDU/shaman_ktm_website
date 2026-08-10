// B2B invariants. This module carries the bulk of the sales target and is the
// one place that tracks money still owed, so:
//   · quote arithmetic is computed, never typed — discount, line totals, margin
//   · the tier's discount fills in a rate only when nothing more specific exists
//   · a rate above MRP is rejected rather than silently inverting the discount
//   · stage history is append-only and dated; won/lost need an explicit reopen
//   · outstanding balance = invoiced (non-draft sales) − everything received,
//     with advances counted as money in hand but reported separately
//   · converting a lead sets BOTH sides of the link, once
//
// Prisma is faked in memory, with rollback on throw so transactional claims mean
// something.

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  tiers: [] as Row[],
  accounts: [] as Row[],
  deals: [] as Row[],
  stageHistory: [] as Row[],
  quoteLines: [] as Row[],
  payments: [] as Row[],
  sales: [] as Row[],
  staff: [] as Row[],
  crmLeads: [] as Row[],
  products: [] as Row[],
  variations: [] as Row[],
  paymentMethods: [] as Row[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (k === "OR" && Array.isArray(v)) {
      return (v as Row[]).some((cond) => matches(row, cond));
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const c = v as Row;
      if ("in" in c) return (c.in as unknown[]).includes(row[k]);
      if ("not" in c) return row[k] !== c.not;
      if ("gte" in c) return (row[k] as number) >= (c.gte as number);
      if ("lte" in c) return (row[k] as number) <= (c.lte as number);
      if ("contains" in c)
        return String(row[k] ?? "")
          .toLowerCase()
          .includes(String(c.contains).toLowerCase());
    }
    return row[k] === v;
  });
}

function model(store: () => Row[], idKey = "id") {
  return {
    findUnique: async ({ where }: { where: Row }) => {
      const row = store().find((r) => matches(r, where));
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
      const row: Row = { [idKey]: nextId("row"), ...data };
      store().push(row);
      return clone(row);
    },
    createMany: async ({ data }: { data: Row[] }) => {
      for (const d of data) store().push({ [idKey]: nextId("row"), ...d });
      return { count: data.length };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = store().find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      Object.assign(row, data);
      return clone(row);
    },
    deleteMany: async ({ where }: { where?: Row } = {}) => {
      const keep = store().filter((r) => !matches(r, where ?? {}));
      const removed = store().length - keep.length;
      store().length = 0;
      store().push(...keep);
      return { count: removed };
    },
    aggregate: async ({ where, _sum }: { where?: Row; _sum?: Row }) => {
      const rows = store().filter((r) => matches(r, where ?? {}));
      const field = Object.keys(_sum ?? {})[0];
      return {
        _sum: {
          [field]: rows.length
            ? rows.reduce((s, r) => s + ((r[field] as number) ?? 0), 0)
            : null,
        },
      };
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
        _count: { _all: rs.length },
        _sum: {
          quoteAmount: rs.reduce((s, r) => s + ((r.quoteAmount as number) ?? 0), 0),
          totalAmount: rs.reduce((s, r) => s + ((r.totalAmount as number) ?? 0), 0),
          amount: rs.reduce((s, r) => s + ((r.amount as number) ?? 0), 0),
        },
      }));
    },
  };
}

const client = {
  b2bTier: model(() => db.tiers, "tier"),
  b2bAccount: model(() => db.accounts),
  b2bDeal: model(() => db.deals),
  b2bDealStageHistory: model(() => db.stageHistory),
  b2bQuoteLine: model(() => db.quoteLines),
  b2bPayment: model(() => db.payments),
  sale: model(() => db.sales),
  staff: model(() => db.staff),
  crmLead: model(() => db.crmLeads),
  product: model(() => db.products),
  productVariation: model(() => db.variations),
  paymentMethodLookup: model(() => db.paymentMethods),
};

async function fakeTransaction<T>(fn: (tx: typeof client) => Promise<T>): Promise<T> {
  const snap = clone({
    tiers: db.tiers,
    accounts: db.accounts,
    deals: db.deals,
    stageHistory: db.stageHistory,
    quoteLines: db.quoteLines,
    payments: db.payments,
    sales: db.sales,
    staff: db.staff,
    crmLeads: db.crmLeads,
    products: db.products,
    variations: db.variations,
    paymentMethods: db.paymentMethods,
  });
  try {
    return await fn(client);
  } catch (err) {
    Object.assign(db, snap);
    throw err;
  }
}

vi.mock("@/lib/db", () => ({
  prisma: { ...client, $transaction: fakeTransaction },
}));

const {
  createAccount,
  updateAccount,
  convertLeadToAccount,
  createDeal,
  changeDealStage,
  reopenDeal,
  replaceQuoteLines,
  recordPayment,
  outstandingBalance,
  listAccounts,
  listDeals,
  listPayments,
} = await import("@/lib/b2b");
const { CmsError } = await import("@/lib/cms/errors");

const STAFF = "staff_sanu";
const PRODUCT = "prod_bowl";
const VAR = "var_small";

beforeEach(() => {
  db.tiers = [
    { tier: 1, label: "Tier 1", minOrderValue: 10000, maxOrderValue: 25000, discountPct: 15, targetMarginPct: 57, commissionPct: 3, active: true },
    { tier: 2, label: "Tier 2", minOrderValue: 25000, maxOrderValue: 75000, discountPct: 20, targetMarginPct: 54, commissionPct: 5, active: true },
    { tier: 3, label: "Tier 3", minOrderValue: 75000, maxOrderValue: null, discountPct: 25, targetMarginPct: 51, commissionPct: 7, active: true },
  ];
  db.accounts = [];
  db.deals = [];
  db.stageHistory = [];
  db.quoteLines = [];
  db.payments = [];
  db.sales = [];
  db.staff = [{ id: STAFF, name: "Sanu", active: true }];
  db.crmLeads = [];
  db.products = [
    { id: PRODUCT, name: "Singing Bowl", price: 5000, sku: "SB-1", wholesalePrice: null },
  ];
  db.variations = [
    {
      id: VAR,
      productId: PRODUCT,
      sku: "SB-1-S",
      price: 5000,
      label: "Small",
      mrp: 5000,
      costPrice: 2000,
      wholesalePrice: null,
    },
  ];
  db.paymentMethods = [{ id: "pm_bank", label: "Bank Transfer", active: true }];
  db.seq = 0;
});

const account = (over: Partial<Parameters<typeof createAccount>[0]> = {}) =>
  createAccount(
    { companyName: "Hotel Yak", accountType: "hotel", tier: 2, ...over },
    STAFF,
  );

describe("accounts", () => {
  it("creates a prospect by default and validates its references", async () => {
    const a = await account();
    expect(a).toMatchObject({
      companyName: "Hotel Yak",
      accountType: "hotel",
      tier: 2,
      status: "prospect",
      createdByStaffId: STAFF,
    });

    await expect(account({ accountType: "airline" as never })).rejects.toThrow(CmsError);
    await expect(account({ status: "haggling" as never })).rejects.toThrow(CmsError);
    await expect(account({ tier: 9 })).rejects.toThrow(/Tier 9 is not configured/i);
    await expect(account({ ownerStaffId: "ghost" })).rejects.toThrow(CmsError);
  });

  it("updates fields and rejects a bad tier on update", async () => {
    const a = await account();
    const updated = await updateAccount(a.id as string, {
      status: "active",
      panNo: "301234567",
    });
    expect(updated).toMatchObject({ status: "active", panNo: "301234567" });
    await expect(updateAccount(a.id as string, { tier: 8 })).rejects.toThrow(CmsError);
    await expect(updateAccount("missing", { status: "active" })).rejects.toThrow(CmsError);
  });
});

describe("convertLeadToAccount", () => {
  it("links both directions in one go", async () => {
    db.crmLeads.push({
      id: "lead_1",
      status: "hot",
      linkedB2bAccountId: null,
      interest: "wholesale_b2b",
    });
    const acc = await convertLeadToAccount({
      crmLeadId: "lead_1",
      account: { companyName: "Spa Serenity", accountType: "spa", tier: 1 },
      createdByStaffId: STAFF,
    });
    // The account remembers where it came from…
    expect(acc.sourceCrmLeadId).toBe("lead_1");
    // …and the lead remembers what it became.
    expect(db.crmLeads[0].linkedB2bAccountId).toBe(acc.id);
  });

  it("refuses to convert the same lead twice", async () => {
    db.crmLeads.push({ id: "lead_2", status: "hot", linkedB2bAccountId: null });
    await convertLeadToAccount({
      crmLeadId: "lead_2",
      account: { companyName: "A", accountType: "other" },
      createdByStaffId: STAFF,
    });
    await expect(
      convertLeadToAccount({
        crmLeadId: "lead_2",
        account: { companyName: "B", accountType: "other" },
        createdByStaffId: STAFF,
      }),
    ).rejects.toThrow(/already linked/i);
    expect(db.accounts).toHaveLength(1);
  });

  it("rejects an unknown lead", async () => {
    await expect(
      convertLeadToAccount({
        crmLeadId: "nope",
        account: { companyName: "X", accountType: "other" },
        createdByStaffId: STAFF,
      }),
    ).rejects.toThrow(CmsError);
  });
});

describe("deals and stage history", () => {
  const newDeal = async (over: Partial<Parameters<typeof createDeal>[0]> = {}) => {
    const a = await account();
    return createDeal(
      { b2bAccountId: a.id as string, dealName: "Q3 bowls", ...over },
      STAFF,
    );
  };

  it("opens at 'contacted' with an opening history row and inherits the account tier", async () => {
    const deal = await newDeal();
    expect(deal.stage).toBe("contacted");
    // Tier came from the account (2), not typed again.
    expect(deal.tierApplied).toBe(2);
    expect(deal.dateBs).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const hist = db.stageHistory.filter((h) => h.dealId === deal.id);
    expect(hist).toHaveLength(1);
    expect(hist[0]).toMatchObject({ fromStage: null, toStage: "contacted" });
  });

  it("records every stage move as a dated row, keeping the chain contiguous", async () => {
    const deal = await newDeal();
    for (const stage of ["meeting_set", "samples_sent", "quoted"] as const) {
      await changeDealStage({
        dealId: deal.id as string,
        toStage: stage,
        changedByStaffId: STAFF,
      });
    }
    const chain = db.stageHistory
      .filter((h) => h.dealId === deal.id)
      .map((h) => [h.fromStage, h.toStage]);
    expect(chain).toEqual([
      [null, "contacted"],
      ["contacted", "meeting_set"],
      ["meeting_set", "samples_sent"],
      ["samples_sent", "quoted"],
    ]);
    expect(db.deals.find((d) => d.id === deal.id)!.stage).toBe("quoted");
  });

  it("rejects a no-op move and an unknown stage", async () => {
    const deal = await newDeal();
    await expect(
      changeDealStage({ dealId: deal.id as string, toStage: "contacted", changedByStaffId: STAFF }),
    ).rejects.toThrow(/already at/i);
    await expect(
      changeDealStage({ dealId: deal.id as string, toStage: "haggling" as never, changedByStaffId: STAFF }),
    ).rejects.toThrow(CmsError);
  });

  it("will not silently move a won or lost deal", async () => {
    for (const closed of ["won", "lost"] as const) {
      const deal = await newDeal({ stage: closed });
      await expect(
        changeDealStage({ dealId: deal.id as string, toStage: "negotiating", changedByStaffId: STAFF }),
      ).rejects.toThrow(/reopen it explicitly/i);
      expect(db.deals.find((d) => d.id === deal.id)!.stage).toBe(closed);
    }
  });

  it("reopens a closed deal as its own dated row, and only into an open stage", async () => {
    const deal = await newDeal({ stage: "lost" });
    await reopenDeal({
      dealId: deal.id as string,
      toStage: "negotiating",
      changedByStaffId: STAFF,
    });
    const last = db.stageHistory.filter((h) => h.dealId === deal.id).at(-1)!;
    expect(last).toMatchObject({ fromStage: "lost", toStage: "negotiating" });
    expect(last.note).toBe("Reopened");

    const open = await newDeal({ stage: "quoted" });
    await expect(
      reopenDeal({ dealId: open.id as string, toStage: "contacted", changedByStaffId: STAFF }),
    ).rejects.toThrow(/not closed/i);

    const lost = await newDeal({ stage: "lost" });
    await expect(
      reopenDeal({ dealId: lost.id as string, toStage: "won", changedByStaffId: STAFF }),
    ).rejects.toThrow(/open stage/i);
  });

  // The link that makes "which sale closed which deal" answerable — specified
  // but unpopulated until the review caught it.
  it("attaches the closing sale when a deal is won", async () => {
    const a = await account();
    const deal = await createDeal(
      { b2bAccountId: a.id as string, dealName: "closer" },
      STAFF,
    );
    db.sales.push({ id: "s_won", b2bAccountId: a.id, status: "confirmed", totalAmount: 40000 });

    const won = await changeDealStage({
      dealId: deal.id as string,
      toStage: "won",
      changedByStaffId: STAFF,
      linkedSaleId: "s_won",
    });
    expect(won.linkedSaleId).toBe("s_won");
  });

  it("only attaches a closing sale on a win, and only this account's confirmed sale", async () => {
    const a = await account();
    const other = await account({ companyName: "Other Co" });
    const deal = await createDeal(
      { b2bAccountId: a.id as string, dealName: "guards" },
      STAFF,
    );
    db.sales.push(
      { id: "s_ok", b2bAccountId: a.id, status: "confirmed", totalAmount: 1000 },
      { id: "s_other", b2bAccountId: other.id, status: "confirmed", totalAmount: 1000 },
      { id: "s_draft", b2bAccountId: a.id, status: "draft", totalAmount: 1000 },
    );

    // Not a win → refuse.
    await expect(
      changeDealStage({ dealId: deal.id as string, toStage: "quoted", changedByStaffId: STAFF, linkedSaleId: "s_ok" }),
    ).rejects.toThrow(/only be attached when moving the deal to "won"/i);
    // Another account's sale → refuse.
    await expect(
      changeDealStage({ dealId: deal.id as string, toStage: "won", changedByStaffId: STAFF, linkedSaleId: "s_other" }),
    ).rejects.toThrow(/not booked to this deal's trade account/i);
    // A draft → refuse.
    await expect(
      changeDealStage({ dealId: deal.id as string, toStage: "won", changedByStaffId: STAFF, linkedSaleId: "s_draft" }),
    ).rejects.toThrow(/still a draft/i);
    // Rejections leave the deal where it was.
    expect(db.deals.find((d) => d.id === deal.id)!.stage).toBe("contacted");
  });

  it("summarises pipeline value by stage", async () => {
    const a = await account();
    await createDeal({ b2bAccountId: a.id as string, dealName: "d1", quoteAmount: 30000 }, STAFF);
    await createDeal({ b2bAccountId: a.id as string, dealName: "d2", quoteAmount: 20000, stage: "quoted" }, STAFF);
    const { pipeline } = await listDeals({});
    expect(pipeline.contacted).toEqual({ count: 1, value: 30000 });
    expect(pipeline.quoted).toEqual({ count: 1, value: 20000 });
    expect(pipeline.won).toEqual({ count: 0, value: 0 });
  });
});

describe("quote lines", () => {
  const dealAtTier = async (tier: number | null) => {
    const a = await account({ tier });
    return createDeal({ b2bAccountId: a.id as string, dealName: "quote" }, STAFF);
  };

  it("computes discount, line totals and margin from the catalog", async () => {
    const deal = await dealAtTier(2); // 20% off
    const [line] = await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 10 }],
    });

    // MRP 5000, tier 2 → 4000/unit.
    expect(line.mrp).toBe(5000);
    expect(line.wholesaleRate).toBe(4000);
    expect(line.lineTotalMrp).toBe(50000);
    expect(line.lineTotalWholesale).toBe(40000);
    expect(line.discountAmount).toBe(10000);
    expect(line.discountPct).toBe(20);
    // costPrice 2000 × 10 = 20000, so margin is 20000 on 40000 = 50%.
    expect(line.costPrice).toBe(2000);
    expect(line.marginAmount).toBe(20000);
    expect(line.marginPct).toBe(50);
    // Snapshots so a later catalog edit can't rewrite a sent quote.
    expect(line.productName).toBe("Singing Bowl");
    expect(line.sku).toBe("SB-1-S");
    expect(line.variantLabel).toBe("Small");
  });

  it("applies each tier's own discount", async () => {
    for (const [tier, rate] of [[1, 4250], [2, 4000], [3, 3750]] as const) {
      const deal = await dealAtTier(tier);
      const [line] = await replaceQuoteLines({
        dealId: deal.id as string,
        lines: [{ productId: PRODUCT, variationId: VAR, qty: 1 }],
      });
      expect(line.wholesaleRate).toBe(rate);
    }
  });

  it("prefers a negotiated rate, then a stored wholesale price, then the tier", async () => {
    const deal = await dealAtTier(2);
    // Explicit negotiated rate wins.
    let [line] = await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 1, wholesaleRate: 3500 }],
    });
    expect(line.wholesaleRate).toBe(3500);

    // Stored variation wholesale price beats the tier calculation.
    db.variations[0].wholesalePrice = 3900;
    [line] = await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 1 }],
    });
    expect(line.wholesaleRate).toBe(3900);
  });

  it("falls back to MRP when there is no tier and no stored rate", async () => {
    const deal = await dealAtTier(null);
    const [line] = await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 2 }],
    });
    // No discount is visible rather than silently invented.
    expect(line.wholesaleRate).toBe(5000);
    expect(line.discountAmount).toBe(0);
    expect(line.discountPct).toBe(0);
  });

  it("rejects a rate above MRP, which would invert the discount", async () => {
    const deal = await dealAtTier(2);
    await expect(
      replaceQuoteLines({
        dealId: deal.id as string,
        lines: [{ productId: PRODUCT, variationId: VAR, qty: 1, wholesaleRate: 9999 }],
      }),
    ).rejects.toThrow(/above MRP/i);
    expect(db.quoteLines).toHaveLength(0);
  });

  it("leaves margin null when cost is unknown, rather than guessing", async () => {
    db.variations[0].costPrice = null;
    const deal = await dealAtTier(2);
    const [line] = await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 1 }],
    });
    expect(line.marginAmount).toBeNull();
    expect(line.marginPct).toBeNull();
  });

  it("derives the deal's quote total from its lines, and clears it when emptied", async () => {
    const deal = await dealAtTier(2);
    await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [
        { productId: PRODUCT, variationId: VAR, qty: 10 },
        { productId: PRODUCT, variationId: VAR, qty: 5 },
      ],
    });
    expect(db.deals.find((d) => d.id === deal.id)!.quoteAmount).toBe(40000 + 20000);

    await replaceQuoteLines({ dealId: deal.id as string, lines: [] });
    expect(db.deals.find((d) => d.id === deal.id)!.quoteAmount).toBeNull();
    expect(db.quoteLines).toHaveLength(0);
  });

  it("replaces rather than appends", async () => {
    const deal = await dealAtTier(2);
    await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 1 }],
    });
    await replaceQuoteLines({
      dealId: deal.id as string,
      lines: [{ productId: PRODUCT, variationId: VAR, qty: 2 }],
    });
    expect(db.quoteLines).toHaveLength(1);
    expect(db.quoteLines[0].qty).toBe(2);
  });

  it("refuses to requote a closed deal, and rejects bad references", async () => {
    const won = await dealAtTier(2);
    await changeDealStage({ dealId: won.id as string, toStage: "won", changedByStaffId: STAFF });
    await expect(
      replaceQuoteLines({
        dealId: won.id as string,
        lines: [{ productId: PRODUCT, variationId: VAR, qty: 1 }],
      }),
    ).rejects.toThrow(/reopen it before changing the quote/i);

    const deal = await dealAtTier(2);
    await expect(
      replaceQuoteLines({ dealId: deal.id as string, lines: [{ productId: "ghost", qty: 1 }] }),
    ).rejects.toThrow(CmsError);
    await expect(
      replaceQuoteLines({
        dealId: deal.id as string,
        lines: [{ productId: PRODUCT, variationId: VAR, qty: 0 }],
      }),
    ).rejects.toThrow(CmsError);
  });
});

describe("payments and outstanding balance", () => {
  it("is invoiced minus received, counting only non-draft sales", async () => {
    const a = await account();
    const id = a.id as string;
    // A draft sale is not yet owed.
    db.sales.push({ id: "sale_draft", b2bAccountId: id, status: "draft", totalAmount: 5000 });
    expect((await outstandingBalance(id)).outstanding).toBe(0);

    db.sales.push({ id: "sale_1", b2bAccountId: id, status: "confirmed", totalAmount: 40000 });
    expect(await outstandingBalance(id)).toMatchObject({
      invoiced: 40000,
      paid: 0,
      outstanding: 40000,
    });

    await recordPayment({
      b2bAccountId: id,
      amount: 15000,
      recordedByStaffId: STAFF,
      paymentMethodId: "pm_bank",
    });
    expect((await outstandingBalance(id)).outstanding).toBe(25000);
  });

  it("counts an advance as money in hand but reports it separately", async () => {
    const a = await account();
    const id = a.id as string;
    await recordPayment({
      b2bAccountId: id,
      amount: 10000,
      isAdvance: true,
      recordedByStaffId: STAFF,
    });
    const balance = await outstandingBalance(id);
    // Nothing invoiced yet, so the account is in credit — negative, not an error.
    expect(balance).toMatchObject({ invoiced: 0, paid: 10000, advances: 10000, outstanding: -10000 });

    db.sales.push({ id: "s1", b2bAccountId: id, status: "confirmed", totalAmount: 25000 });
    expect((await outstandingBalance(id)).outstanding).toBe(15000);
  });

  it("nets a voided sale's reversal out of what is owed", async () => {
    const a = await account();
    const id = a.id as string;
    db.sales.push(
      { id: "s_orig", b2bAccountId: id, status: "void", totalAmount: 30000 },
      { id: "s_rev", b2bAccountId: id, status: "confirmed", totalAmount: -30000, reversesSaleId: "s_orig" },
    );
    // Both rows are non-draft, so they cancel — the account owes nothing.
    expect((await outstandingBalance(id)).outstanding).toBe(0);
  });

  it("accepts a negative amount as a refund", async () => {
    const a = await account();
    const id = a.id as string;
    db.sales.push({ id: "s1", b2bAccountId: id, status: "confirmed", totalAmount: 10000 });
    await recordPayment({ b2bAccountId: id, amount: 10000, recordedByStaffId: STAFF });
    await recordPayment({ b2bAccountId: id, amount: -4000, recordedByStaffId: STAFF, note: "refund" });
    expect((await outstandingBalance(id)).outstanding).toBe(4000);
  });

  // Both of these came out of the adversarial review: either one lets an
  // account show a phantom credit balance for money it was never invoiced.
  it("refuses to attach a payment to a draft sale", async () => {
    const a = await account();
    const id = a.id as string;
    db.sales.push({ id: "s_draft", b2bAccountId: id, status: "draft", totalAmount: 100000 });
    await expect(
      recordPayment({ b2bAccountId: id, amount: 50000, saleId: "s_draft", recordedByStaffId: STAFF }),
    ).rejects.toThrow(/still a draft/i);
    // Nothing recorded, so no phantom credit.
    expect((await outstandingBalance(id)).outstanding).toBe(0);
  });

  it("refuses to attach a payment to a retail sale with no trade account", async () => {
    const a = await account();
    const id = a.id as string;
    db.sales.push({ id: "s_retail", b2bAccountId: null, status: "confirmed", totalAmount: 10000 });
    await expect(
      recordPayment({ b2bAccountId: id, amount: 10000, saleId: "s_retail", recordedByStaffId: STAFF }),
    ).rejects.toThrow(/isn't booked to a trade account/i);
    expect((await outstandingBalance(id)).outstanding).toBe(0);
  });

  it("rejects a zero amount, unknown account, staff, method, or foreign sale", async () => {
    const a = await account();
    const id = a.id as string;
    await expect(
      recordPayment({ b2bAccountId: id, amount: 0, recordedByStaffId: STAFF }),
    ).rejects.toThrow(CmsError);
    await expect(
      recordPayment({ b2bAccountId: "ghost", amount: 100, recordedByStaffId: STAFF }),
    ).rejects.toThrow(CmsError);
    await expect(
      recordPayment({ b2bAccountId: id, amount: 100, recordedByStaffId: "ghost" }),
    ).rejects.toThrow(CmsError);
    await expect(
      recordPayment({ b2bAccountId: id, amount: 100, recordedByStaffId: STAFF, paymentMethodId: "pm_ghost" }),
    ).rejects.toThrow(CmsError);

    const other = await account({ companyName: "Other Co" });
    db.sales.push({ id: "s_other", b2bAccountId: other.id, status: "confirmed", totalAmount: 1 });
    await expect(
      recordPayment({ b2bAccountId: id, amount: 100, saleId: "s_other", recordedByStaffId: STAFF }),
    ).rejects.toThrow(/different trade account/i);
  });

  it("stamps both calendars on a payment", async () => {
    const a = await account();
    const p = await recordPayment({
      b2bAccountId: a.id as string,
      amount: 500,
      paidAt: new Date("2026-08-09T06:00:00Z"),
      recordedByStaffId: STAFF,
    });
    expect(p.dateBs).toBe("2083-04-24");
  });
});

describe("listing", () => {
  it("filters accounts and includes each one's balance", async () => {
    const a = await account({ companyName: "Hotel Yak", status: "active" });
    await account({ companyName: "Spa Serenity", accountType: "spa", tier: 1 });
    db.sales.push({ id: "s1", b2bAccountId: a.id, status: "confirmed", totalAmount: 12000 });

    const all = await listAccounts({});
    expect(all.total).toBe(2);
    const yak = all.accounts.find((x) => x.companyName === "Hotel Yak")!;
    expect(yak.balance.outstanding).toBe(12000);

    expect((await listAccounts({ accountType: "spa" })).total).toBe(1);
    expect((await listAccounts({ status: "active" })).total).toBe(1);
    expect((await listAccounts({ tier: 1 })).total).toBe(1);
    expect((await listAccounts({ q: "yak" })).total).toBe(1);
  });

  it("filters payments and totals what came in", async () => {
    const a = await account();
    const id = a.id as string;
    await recordPayment({ b2bAccountId: id, amount: 5000, recordedByStaffId: STAFF });
    await recordPayment({ b2bAccountId: id, amount: 2000, isAdvance: true, recordedByStaffId: STAFF });
    expect((await listPayments({})).totalReceived).toBe(7000);
    expect((await listPayments({ isAdvance: true })).total).toBe(1);
  });
});
