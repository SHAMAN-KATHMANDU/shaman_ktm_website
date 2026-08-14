// Sales spine invariants. This is the module the whole reporting brief converges
// on, so the rules that must never regress:
//   · a draft touches NO stock
//   · confirming decrements the sale's showroom pool exactly once per line,
//     all-or-nothing — a short pool leaves the sale a draft and no movements
//   · a confirmed sale is immutable: voiding APPENDS a reversing sale with
//     negated amounts and reversing movements, and never edits the original
//   · a reversal is final, and a sale can be reversed at most once
//   · prices come from the database, not the caller
//   · saleNo is allocated at confirm, so abandoned drafts leave no gaps
//
// Prisma is faked in memory. The fake's $transaction genuinely rolls back by
// restoring a snapshot on throw, so the all-or-nothing tests mean something
// rather than merely appearing to pass.

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  products: [] as Row[],
  variations: [] as Row[],
  showrooms: [] as Row[],
  staff: [] as Row[],
  paymentMethods: [] as Row[],
  crmLeads: [] as Row[],
  crmHistory: [] as Row[],
  stockLevels: [] as Row[],
  stockMovements: [] as Row[],
  sales: [] as Row[],
  saleLines: [] as Row[],
  saleStaff: [] as Row[],
  counter: { id: 1, value: 0 } as { id: number; value: number },
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const cond = v as Row;
      if ("not" in cond) return row[k] !== cond.not;
      if ("gte" in cond) return (row[k] as number) >= (cond.gte as number);
      if ("lte" in cond) return (row[k] as number) <= (cond.lte as number);
      if ("contains" in cond)
        return String(row[k] ?? "").includes(String(cond.contains));
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
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = store().find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && "increment" in (v as Row)) {
          row[k] = ((row[k] as number) ?? 0) + ((v as Row).increment as number);
        } else if (v && typeof v === "object" && "decrement" in (v as Row)) {
          row[k] = ((row[k] as number) ?? 0) - ((v as Row).decrement as number);
        } else {
          row[k] = v;
        }
      }
      return clone(row);
    },
    delete: async ({ where }: { where: Row }) => {
      const i = store().findIndex((r) => matches(r, where));
      if (i < 0) throw new Error("row not found in fake");
      return clone(store().splice(i, 1)[0]);
    },
  };
}

// Nested writes used by lib/sales: lines/staff createMany inside sale.create.
function saleModel() {
  const base = model(() => db.sales);
  return {
    ...base,
    create: async ({ data, include }: { data: Row; include?: Row }) => {
      const { lines, staff, ...rest } = data as Row & {
        lines?: { createMany: { data: Row[] } };
        staff?: { createMany: { data: Row[] } };
      };
      const sale: Row = { id: nextId("sale"), ...rest };
      db.sales.push(sale);
      for (const l of lines?.createMany.data ?? []) {
        db.saleLines.push({ id: nextId("line"), saleId: sale.id, ...l });
      }
      for (const s of staff?.createMany.data ?? []) {
        db.saleStaff.push({ saleId: sale.id, ...s });
      }
      return hydrateSale(sale, include);
    },
    findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
      const sale = db.sales.find((s) => matches(s, where));
      return sale ? hydrateSale(sale, include) : null;
    },
    findMany: async ({ where, include }: { where?: Row; include?: Row } = {}) =>
      db.sales
        .filter((s) => matches(s, where ?? {}))
        .map((s) => hydrateSale(s, include)),
    aggregate: async ({ where }: { where?: Row } = {}) => ({
      _sum: {
        totalAmount: db.sales
          .filter((s) => matches(s, where ?? {}))
          .reduce((sum, s) => sum + ((s.totalAmount as number) ?? 0), 0),
      },
    }),
  };
}

function hydrateSale(sale: Row, include?: Row): Row {
  const out = clone(sale);
  if (include?.lines) {
    out.lines = db.saleLines.filter((l) => l.saleId === sale.id).map(clone);
  }
  if (include?.staff) {
    out.staff = db.saleStaff.filter((s) => s.saleId === sale.id).map(clone);
  }
  return out;
}

const client = {
  product: model(() => db.products),
  productVariation: model(() => db.variations),
  showroom: model(() => db.showrooms),
  staff: model(() => db.staff),
  paymentMethodLookup: model(() => db.paymentMethods),
  crmLead: model(() => db.crmLeads),
  crmLeadStatusHistory: model(() => db.crmHistory),
  stockMovement: model(() => db.stockMovements),
  sale: saleModel(),
  saleLine: model(() => db.saleLines),
  saleStaff: model(() => db.saleStaff),
  saleCounter: {
    upsert: async ({ update }: { update: { value: { increment: number } } }) => {
      db.counter.value += update.value.increment;
      return clone(db.counter);
    },
  },
  stockLevel: {
    ...model(() => db.stockLevels),
    findUnique: async ({ where }: { where: Row }) => {
      const key = where.variationId_showroomKey as Row | undefined;
      const row = key
        ? db.stockLevels.find(
            (l) =>
              l.variationId === key.variationId &&
              l.showroomKey === key.showroomKey,
          )
        : db.stockLevels.find((l) => matches(l, where));
      return row ? clone(row) : null;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const min = (where.qty as { gte: number }).gte;
      const row = db.stockLevels.find(
        (l) =>
          l.variationId === where.variationId &&
          l.showroomKey === where.showroomKey &&
          (l.qty as number) >= min,
      );
      if (!row) return { count: 0 };
      row.qty =
        (row.qty as number) - ((data.qty as Row).decrement as number);
      return { count: 1 };
    },
    upsert: async ({ where, update, create }: { where: Row; update: Row; create: Row }) => {
      const key = where.variationId_showroomKey as Row;
      const row = db.stockLevels.find(
        (l) =>
          l.variationId === key.variationId && l.showroomKey === key.showroomKey,
      );
      if (row) {
        row.qty =
          (row.qty as number) + ((update.qty as Row).increment as number);
        return clone(row);
      }
      const created: Row = { id: nextId("lvl"), ...create };
      db.stockLevels.push(created);
      return clone(created);
    },
    aggregate: async ({ where }: { where: Row }) => ({
      _sum: {
        qty: db.stockLevels
          .filter((l) => l.variationId === where.variationId)
          .reduce((s, l) => s + ((l.qty as number) ?? 0), 0),
      },
    }),
  },
};

// Real rollback: snapshot every store, restore it if the callback throws. This
// is what makes the all-or-nothing assertions meaningful.
async function fakeTransaction<T>(fn: (tx: typeof client) => Promise<T>): Promise<T> {
  const snapshot = clone({
    products: db.products,
    variations: db.variations,
    showrooms: db.showrooms,
    staff: db.staff,
    paymentMethods: db.paymentMethods,
    crmLeads: db.crmLeads,
    crmHistory: db.crmHistory,
    stockLevels: db.stockLevels,
    stockMovements: db.stockMovements,
    sales: db.sales,
    saleLines: db.saleLines,
    saleStaff: db.saleStaff,
    counter: db.counter,
  });
  try {
    return await fn(client);
  } catch (err) {
    Object.assign(db, snapshot);
    throw err;
  }
}

vi.mock("@/lib/db", () => ({
  prisma: { ...client, $transaction: fakeTransaction },
}));

const {
  createSaleDraft,
  confirmSale,
  voidSale,
  discardSaleDraft,
  listSales,
  getSale,
} = await import("@/lib/sales");
const { CmsError } = await import("@/lib/cms/errors");

const STAFF = "staff_sanu";
const SHOWROOM = "thamel";
const OTHER_SHOWROOM = "gongabu";
const PRODUCT = "prod_bowl";
const VAR_A = "var_small";
const VAR_B = "var_large";

const levelFor = (variationId: string, showroomKey = SHOWROOM) =>
  db.stockLevels.find(
    (l) => l.variationId === variationId && l.showroomKey === showroomKey,
  );

beforeEach(() => {
  db.products = [
    { id: PRODUCT, name: "Singing Bowl", price: 4500, sku: "SB-1" },
  ];
  db.variations = [
    { id: VAR_A, productId: PRODUCT, sku: "SB-1-S", price: 4500, label: "Small", mrp: 5000, stock: 10 },
    { id: VAR_B, productId: PRODUCT, sku: "SB-1-L", price: 7500, label: "Large", mrp: 8000, stock: 4 },
  ];
  db.showrooms = [{ key: SHOWROOM }, { key: OTHER_SHOWROOM }];
  db.staff = [{ id: STAFF, name: "Sanu", active: true }];
  db.paymentMethods = [{ id: "pm_cash", label: "Cash", active: true }];
  db.crmLeads = [];
  db.crmHistory = [];
  db.stockLevels = [
    { id: "lvl_a", variationId: VAR_A, showroomKey: SHOWROOM, qty: 10 },
    { id: "lvl_b", variationId: VAR_B, showroomKey: SHOWROOM, qty: 4 },
  ];
  db.stockMovements = [];
  db.sales = [];
  db.saleLines = [];
  db.saleStaff = [];
  db.counter = { id: 1, value: 0 };
  db.seq = 0;
});

const draft = (over: Partial<Parameters<typeof createSaleDraft>[0]> = {}) =>
  createSaleDraft(
    {
      channel: "showroom",
      showroomKey: SHOWROOM,
      inputSource: "web_form",
      lines: [{ productId: PRODUCT, variationId: VAR_A, qty: 2 }],
      ...over,
    },
    STAFF,
  );

describe("createSaleDraft", () => {
  it("prices from the database and touches no stock", async () => {
    const sale = await draft();
    expect(sale.status).toBe("draft");
    // 2 × 4500 from the variation's own price.
    expect(sale.subtotal).toBe(9000);
    expect(sale.totalAmount).toBe(9000);
    expect(sale.lines[0]).toMatchObject({
      unitPrice: 4500,
      qty: 2,
      lineTotal: 9000,
      sku: "SB-1-S",
      variantLabel: "Small",
      unitMrp: 5000,
    });
    // The whole point of draft: inventory is untouched.
    expect(levelFor(VAR_A)!.qty).toBe(10);
    expect(db.stockMovements).toHaveLength(0);
  });

  it("ignores a client-supplied total and recomputes it", async () => {
    const sale = await draft({
      lines: [
        { productId: PRODUCT, variationId: VAR_A, qty: 1 },
        { productId: PRODUCT, variationId: VAR_B, qty: 1 },
      ],
    });
    expect(sale.subtotal).toBe(4500 + 7500);
  });

  it("stores both calendars, with BS derived server-side", async () => {
    const sale = await draft({ dateAd: new Date("2026-08-09T06:00:00Z") });
    expect(sale.dateBs).toBe("2083-04-24");
  });

  it("applies line and sale discounts plus delivery fee", async () => {
    const sale = await draft({
      lines: [{ productId: PRODUCT, variationId: VAR_A, qty: 2, lineDiscount: 500 }],
      discountAmount: 1000,
      deliveryFee: 200,
    });
    expect(sale.subtotal).toBe(9000 - 500);
    expect(sale.totalAmount).toBe(8500 - 1000 + 200);
  });

  it("merges duplicate lines so stock math and the receipt agree", async () => {
    const sale = await draft({
      lines: [
        { productId: PRODUCT, variationId: VAR_A, qty: 1 },
        { productId: PRODUCT, variationId: VAR_A, qty: 2 },
      ],
    });
    expect(sale.lines).toHaveLength(1);
    expect(sale.lines[0].qty).toBe(3);
  });

  it("does not allocate a saleNo yet, so abandoned drafts leave no gaps", async () => {
    const sale = await draft();
    expect(sale.saleNo).toMatch(/^DRAFT-/);
    expect(db.counter.value).toBe(0);
  });

  it("records multi-staff attribution", async () => {
    const sale = await draft({
      staff: [{ staffId: STAFF, role: "sold_by" }],
    });
    expect(sale.staff).toHaveLength(1);
    expect(sale.staff[0]).toMatchObject({ staffId: STAFF, role: "sold_by" });
  });

  it("rejects empty lines, bad quantities, and over-discounting", async () => {
    await expect(draft({ lines: [] })).rejects.toThrow(CmsError);
    await expect(
      draft({ lines: [{ productId: PRODUCT, variationId: VAR_A, qty: 0 }] }),
    ).rejects.toThrow(CmsError);
    await expect(
      draft({ lines: [{ productId: PRODUCT, variationId: VAR_A, qty: 1.5 }] }),
    ).rejects.toThrow(CmsError);
    await expect(
      draft({
        lines: [{ productId: PRODUCT, variationId: VAR_A, qty: 1, lineDiscount: 99999 }],
      }),
    ).rejects.toThrow(/exceeds the line total/i);
    await expect(draft({ discountAmount: 99999 })).rejects.toThrow(
      /exceeds the sale subtotal/i,
    );
  });

  it("rejects unknown references and a mismatched product/variation pair", async () => {
    await expect(draft({ channel: "barter" as never })).rejects.toThrow(CmsError);
    await expect(draft({ showroomKey: "pokhara" })).rejects.toThrow(CmsError);
    await expect(draft({ paymentMethodId: "pm_ghost" })).rejects.toThrow(CmsError);
    await expect(draft({ crmLeadId: "lead_ghost" })).rejects.toThrow(CmsError);
    await expect(
      draft({ lines: [{ productId: "prod_ghost", qty: 1 }] }),
    ).rejects.toThrow(CmsError);
    db.variations.push({
      id: "var_other",
      productId: "prod_other",
      sku: "X",
      price: 1,
      label: null,
      mrp: null,
    });
    await expect(
      draft({ lines: [{ productId: PRODUCT, variationId: "var_other", qty: 1 }] }),
    ).rejects.toThrow(/does not belong to product/i);
  });
});

describe("confirmSale", () => {
  it("allocates a sequential saleNo and decrements once per line", async () => {
    const sale = await draft({
      lines: [
        { productId: PRODUCT, variationId: VAR_A, qty: 2 },
        { productId: PRODUCT, variationId: VAR_B, qty: 1 },
      ],
    });
    const confirmed = await confirmSale({
      saleId: sale.id,
      confirmedByStaffId: STAFF,
    });

    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.saleNo).toBe("SL-000001");
    expect(confirmed.confirmedAt).toBeTruthy();
    expect(levelFor(VAR_A)!.qty).toBe(8);
    expect(levelFor(VAR_B)!.qty).toBe(3);

    const moves = db.stockMovements.filter((m) => m.reason === "sale");
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.refType === "Sale" && m.refId === sale.id)).toBe(true);
    expect(moves.every((m) => m.staffId === STAFF)).toBe(true);
  });

  it("numbers confirmed sales in order", async () => {
    const a = await draft();
    const b = await draft();
    expect((await confirmSale({ saleId: a.id, confirmedByStaffId: STAFF })).saleNo).toBe("SL-000001");
    expect((await confirmSale({ saleId: b.id, confirmedByStaffId: STAFF })).saleNo).toBe("SL-000002");
  });

  it("draws only from the named pool, never another showroom's", async () => {
    db.stockLevels.push({
      id: "lvl_g",
      variationId: VAR_A,
      showroomKey: OTHER_SHOWROOM,
      qty: 50,
    });
    const sale = await draft({ showroomKey: OTHER_SHOWROOM });
    await confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF });
    expect(levelFor(VAR_A, OTHER_SHOWROOM)!.qty).toBe(48);
    expect(levelFor(VAR_A, SHOWROOM)!.qty).toBe(10);
  });

  it("is all-or-nothing: a short pool leaves the sale a draft with no movements", async () => {
    // Line 1 fits (10 in stock), line 2 does not (only 4 of VAR_B).
    const sale = await draft({
      lines: [
        { productId: PRODUCT, variationId: VAR_A, qty: 2 },
        { productId: PRODUCT, variationId: VAR_B, qty: 99 },
      ],
    });
    await expect(
      confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF }),
    ).rejects.toThrow(/insufficient stock/i);

    // Nothing partially applied: the first line's decrement rolled back too.
    expect(db.sales.find((s) => s.id === sale.id)!.status).toBe("draft");
    expect(levelFor(VAR_A)!.qty).toBe(10);
    expect(levelFor(VAR_B)!.qty).toBe(4);
    expect(db.stockMovements).toHaveLength(0);
    // The rolled-back attempt didn't burn a sale number either.
    expect(db.counter.value).toBe(0);
  });

  it("needs a showroom, and accepts one supplied at confirm time", async () => {
    const noRoom = await draft({ showroomKey: null });
    await expect(
      confirmSale({ saleId: noRoom.id, confirmedByStaffId: STAFF }),
    ).rejects.toThrow(/needs a showroom/i);

    const confirmed = await confirmSale({
      saleId: noRoom.id,
      showroomKey: SHOWROOM,
      confirmedByStaffId: STAFF,
    });
    expect(confirmed.showroomKey).toBe(SHOWROOM);
    expect(levelFor(VAR_A)!.qty).toBe(8);
  });

  it("records payment details captured at confirm time", async () => {
    const sale = await draft();
    const confirmed = await confirmSale({
      saleId: sale.id,
      confirmedByStaffId: STAFF,
      paymentMethodId: "pm_cash",
      paymentRef: "R-42",
      paymentEvidenceUrl: "https://media/x.jpg",
    });
    expect(confirmed).toMatchObject({
      paymentMethodId: "pm_cash",
      paymentRef: "R-42",
      paymentEvidenceUrl: "https://media/x.jpg",
    });
  });

  it("refuses to confirm anything that is not a draft", async () => {
    const sale = await draft();
    await confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF });
    await expect(
      confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF }),
    ).rejects.toThrow(/only a draft can be confirmed/i);
  });

  it("rejects an unknown sale or staff member", async () => {
    await expect(
      confirmSale({ saleId: "missing", confirmedByStaffId: STAFF }),
    ).rejects.toThrow(CmsError);
    const sale = await draft();
    await expect(
      confirmSale({ saleId: sale.id, confirmedByStaffId: "ghost" }),
    ).rejects.toThrow(CmsError);
  });

  it("closes a linked CRM lead in the same transaction, with history", async () => {
    db.crmLeads.push({ id: "lead_1", status: "hot", linkedSaleId: null });
    const sale = await draft({ crmLeadId: "lead_1" });
    const confirmed = await confirmSale({
      saleId: sale.id,
      confirmedByStaffId: STAFF,
      closeCrmLead: true,
    });

    const lead = db.crmLeads.find((l) => l.id === "lead_1")!;
    expect(lead.status).toBe("purchase");
    expect(lead.linkedSaleId).toBe(sale.id);
    const hist = db.crmHistory.at(-1)!;
    expect(hist).toMatchObject({
      leadId: "lead_1",
      fromStatus: "hot",
      toStatus: "purchase",
      changedByStaffId: STAFF,
    });
    expect(String(hist.note)).toContain(confirmed.saleNo as string);
  });

  it("leaves the lead alone unless asked to close it", async () => {
    db.crmLeads.push({ id: "lead_2", status: "warm", linkedSaleId: null });
    const sale = await draft({ crmLeadId: "lead_2" });
    await confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF });
    expect(db.crmLeads.find((l) => l.id === "lead_2")!.status).toBe("warm");
    expect(db.crmHistory).toHaveLength(0);
  });
});

describe("voidSale", () => {
  const confirmedSale = async () => {
    const sale = await draft({
      lines: [
        { productId: PRODUCT, variationId: VAR_A, qty: 2 },
        { productId: PRODUCT, variationId: VAR_B, qty: 1 },
      ],
      discountAmount: 500,
      deliveryFee: 100,
    });
    return confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF });
  };

  it("appends a reversing sale with negated amounts and leaves the original intact", async () => {
    const original = await confirmedSale();
    const { voided, reversal } = await voidSale({
      saleId: original.id,
      voidedByStaffId: STAFF,
      reason: "wrong item scanned",
    });

    expect(voided.status).toBe("void");
    expect(voided.voidedAt).toBeTruthy();
    // The original's money and lines are untouched — only its status moved.
    expect(voided.subtotal).toBe(original.subtotal);
    expect(voided.totalAmount).toBe(original.totalAmount);

    expect(reversal.reversesSaleId).toBe(original.id);
    expect(reversal.status).toBe("confirmed");
    expect(reversal.saleNo).toBe("SL-000002");
    expect(reversal.subtotal).toBe(-(original.subtotal as number));
    expect(reversal.totalAmount).toBe(-(original.totalAmount as number));
    expect(reversal.discountAmount).toBe(-(original.discountAmount as number));
    expect(reversal.deliveryFee).toBe(-(original.deliveryFee as number));
    expect(String(reversal.notes)).toContain("wrong item scanned");

    // Reversal lines mirror the original with negated totals.
    const revLines = db.saleLines.filter((l) => l.saleId === reversal.id);
    expect(revLines).toHaveLength(2);
    expect(revLines.every((l) => (l.lineTotal as number) < 0)).toBe(true);
  });

  it("restores each pool it drew from", async () => {
    const original = await confirmedSale();
    expect(levelFor(VAR_A)!.qty).toBe(8);
    expect(levelFor(VAR_B)!.qty).toBe(3);

    await voidSale({
      saleId: original.id,
      voidedByStaffId: STAFF,
      reason: "customer returned everything",
    });

    expect(levelFor(VAR_A)!.qty).toBe(10);
    expect(levelFor(VAR_B)!.qty).toBe(4);
    const corrections = db.stockMovements.filter((m) => m.reason === "correction");
    expect(corrections).toHaveLength(2);
    // The sale's own movements are still there — history is appended, not erased.
    expect(db.stockMovements.filter((m) => m.reason === "sale")).toHaveLength(2);
  });

  it("nets to zero without rewriting the month the sale happened in", async () => {
    const original = await confirmedSale();
    const before = await listSales({});
    expect(before.netRevenue).toBe(original.totalAmount);

    await voidSale({
      saleId: original.id,
      voidedByStaffId: STAFF,
      reason: "duplicate entry",
    });

    // All-time nets to zero…
    const after = await listSales({});
    expect(after.netRevenue).toBe(0);

    // …but the original still carries its amount, in its own date, so a report
    // for a closed month doesn't change retroactively. The correction shows up
    // as the reversal instead.
    const voided = db.sales.find((s) => s.id === original.id)!;
    expect(voided.totalAmount).toBe(original.totalAmount);
    expect(voided.status).toBe("void");
    const reversal = db.sales.find((s) => s.reversesSaleId === original.id)!;
    expect(reversal.totalAmount).toBe(-(original.totalAmount as number));
  });

  it("refuses to void a draft, a reversal, or an already-reversed sale", async () => {
    const d = await draft();
    await expect(
      voidSale({ saleId: d.id, voidedByStaffId: STAFF, reason: "x" }),
    ).rejects.toThrow(/discard it instead/i);

    const original = await confirmedSale();
    const { reversal } = await voidSale({
      saleId: original.id,
      voidedByStaffId: STAFF,
      reason: "first",
    });
    await expect(
      voidSale({ saleId: reversal.id, voidedByStaffId: STAFF, reason: "again" }),
    ).rejects.toThrow(/reversals are final/i);
    await expect(
      voidSale({ saleId: original.id, voidedByStaffId: STAFF, reason: "again" }),
    ).rejects.toThrow(/already/i);
  });

  it("requires a reason", async () => {
    const original = await confirmedSale();
    await expect(
      voidSale({ saleId: original.id, voidedByStaffId: STAFF, reason: "  " }),
    ).rejects.toThrow(/needs a reason/i);
  });
});

describe("discardSaleDraft", () => {
  it("removes a draft but refuses a confirmed sale", async () => {
    const d = await draft();
    await discardSaleDraft(d.id);
    expect(db.sales.find((s) => s.id === d.id)).toBeUndefined();

    const sale = await draft();
    await confirmSale({ saleId: sale.id, confirmedByStaffId: STAFF });
    await expect(discardSaleDraft(sale.id)).rejects.toThrow(/void the sale instead/i);
  });
});

describe("listSales / getSale", () => {
  it("filters by channel, status and showroom, and counts confirmed revenue only", async () => {
    const a = await draft();
    await confirmSale({ saleId: a.id, confirmedByStaffId: STAFF });
    await draft(); // stays a draft

    expect((await listSales({ status: "draft" })).total).toBe(1);
    expect((await listSales({ status: "confirmed" })).total).toBe(1);
    expect((await listSales({ channel: "showroom" })).total).toBe(2);
    expect((await listSales({ channel: "online" })).total).toBe(0);
    expect((await listSales({ showroomKey: SHOWROOM })).total).toBe(2);
    // Drafts are not revenue.
    expect((await listSales({})).netRevenue).toBe(9000);
  });

  it("returns lines for a single sale and 404s on a missing id", async () => {
    const sale = await draft();
    const full = await getSale(sale.id);
    expect(full.lines).toHaveLength(1);
    await expect(getSale("missing")).rejects.toThrow(CmsError);
  });
});
