// Wholesale-section invariants.
//
// Two things this module must never get wrong:
//   · the trade price never leaves the server — MOQ is public, the rate is what
//     the enquiry is FOR, and a leak can't be walked back once it's indexed
//   · an enquiry becomes a real CRM lead with no staff author, rather than
//     either being dropped or inventing a person who wrote it down
//
// The fake honours `select`, so the secrecy test is a real assertion about the
// query the code issues rather than about the fake's own defaults.

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  products: [] as Row[],
  categories: [] as Row[],
  leadSources: [] as Row[],
  leads: [] as Row[],
  history: [] as Row[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;

function clone<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as T;
  if (Array.isArray(v)) return v.map((x) => clone(x)) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, clone(val)]),
    ) as T;
  }
  return v;
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      const c = v as Row;
      if ("not" in c) return row[k] !== c.not;
      if ("in" in c) return (c.in as unknown[]).includes(row[k]);
      if ("notIn" in c) return !(c.notIn as unknown[]).includes(row[k]);
    }
    return row[k] === v;
  });
}

/** Project a row down to the selected fields, the way Prisma does. */
function project(row: Row, select?: Row): Row {
  if (!select) return clone(row);
  const out: Row = {};
  for (const [key, spec] of Object.entries(select)) {
    if (!spec) continue;
    if (key === "category") {
      const cat = db.categories.find((c) => c.id === row.categoryId);
      out.category = cat
        ? project(cat, (spec as { select?: Row }).select)
        : null;
      continue;
    }
    out[key] = clone(row[key]);
  }
  return out;
}

const client = {
  product: {
    findMany: async ({ where, select }: { where?: Row; select?: Row } = {}) =>
      db.products.filter((r) => matches(r, where ?? {})).map((r) => project(r, select)),
  },
  leadSource: {
    upsert: async ({ where, create }: { where: Row; create: Row }) => {
      const found = db.leadSources.find((r) => matches(r, where));
      if (found) return clone(found);
      const created: Row = { id: nextId("src"), ...create };
      db.leadSources.push(created);
      return clone(created);
    },
  },
  crmLead: {
    findMany: async ({ where }: { where?: Row } = {}) =>
      db.leads.filter((r) => matches(r, where ?? {})).map(clone),
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = db.leads.find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      Object.assign(row, data);
      return clone(row);
    },
    create: async ({ data }: { data: Row }) => {
      const row: Row = { id: nextId("lead"), createdAt: new Date(), ...data };
      db.leads.push(row);
      return clone(row);
    },
  },
  crmLeadStatusHistory: {
    create: async ({ data }: { data: Row }) => {
      const row: Row = { id: nextId("hist"), createdAt: new Date(), ...data };
      db.history.push(row);
      return clone(row);
    },
  },
};

async function fakeTransaction<T>(fn: (tx: typeof client) => Promise<T>): Promise<T> {
  const snap = clone({ leads: db.leads, history: db.history });
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

const { listWholesaleProducts } = await import("@/lib/wholesale");
const { createWebEnquiry } = await import("@/lib/crm");

beforeEach(() => {
  db.categories = [{ id: "cat1", name: "Singing Bowls", nameNe: "सिंगिङ बाउल" }];
  db.products = [
    {
      id: "p1",
      slug: "bowl",
      name: "Singing Bowl",
      nameNe: "सिंगिङ बाउल",
      thumbnailUrl: "/bowl.jpg",
      moq: 20,
      elementSlugs: ["metal"],
      categoryId: "cat1",
      status: "published",
      wholesaleEnabled: true,
      // The fields that must never come back:
      wholesalePrice: 2800,
      price: 4500,
      legacyImsCode: "BOWL-1",
      qrPayload: "SKM:BOWL-1",
    },
    {
      id: "p2",
      slug: "retail-only",
      name: "Retail Only",
      moq: null,
      elementSlugs: [],
      status: "published",
      wholesaleEnabled: false,
      wholesalePrice: 900,
    },
    {
      id: "p3",
      slug: "draft-wholesale",
      name: "Draft Wholesale",
      moq: 10,
      elementSlugs: [],
      status: "draft",
      wholesaleEnabled: true,
    },
  ];
  db.leadSources = [];
  db.leads = [];
  db.history = [];
  db.seq = 0;
});

describe("the wholesale catalogue", () => {
  it("lists only the curated, published subset", async () => {
    const rows = await listWholesaleProducts();
    expect(rows.map((r) => r.slug)).toEqual(["bowl"]);
  });

  it("never returns the trade price, cost, or the internal codes", async () => {
    const rows = await listWholesaleProducts();
    const serialised = JSON.stringify(rows);

    // The value itself, by any route.
    expect(serialised).not.toContain("2800");
    expect(serialised).not.toContain("wholesalePrice");
    expect(serialised).not.toContain("costPrice");
    // Internal join keys have no business on a public page either.
    expect(serialised).not.toContain("legacyImsCode");
    expect(serialised).not.toContain("BOWL-1");
    expect(serialised).not.toContain("qrPayload");
  });

  it("publishes the MOQ, which is the number a trade buyer needs", async () => {
    const [row] = await listWholesaleProducts();
    expect(row.moq).toBe(20);
  });

  it("falls back to English when a Nepali name is missing", async () => {
    expect((await listWholesaleProducts("ne"))[0].name).toBe("सिंगिङ बाउल");
    db.products[0].nameNe = null;
    expect((await listWholesaleProducts("ne"))[0].name).toBe("Singing Bowl");
  });
});

describe("a wholesale enquiry", () => {
  const enquiry = {
    name: "Maya Gurung",
    phone: "9812345678",
    interest: "wholesale_b2b" as const,
    companyName: "Hotel Yak",
    productInterest: "Singing Bowl",
    quantityNeeded: 40,
  };

  it("becomes a CRM lead with no staff author", async () => {
    const lead = await createWebEnquiry(enquiry);

    expect(lead.interest).toBe("wholesale_b2b");
    expect(lead.status).toBe("new");
    // Nobody wrote it down — and no invented "Website" staff member either.
    expect(lead.createdByStaffId).toBeNull();
    // Where it came from is still recorded, which is the guarantee that matters.
    expect(db.leadSources.find((s) => s.id === lead.sourceId)?.label).toBe(
      "Website",
    );
  });

  it("still opens its status history, authored by nobody", async () => {
    await createWebEnquiry(enquiry);
    expect(db.history).toHaveLength(1);
    expect(db.history[0].fromStatus).toBeNull();
    expect(db.history[0].toStatus).toBe("new");
    expect(db.history[0].changedByStaffId).toBeNull();
  });

  it("keeps the company, product and quantity where staff will read them", async () => {
    const lead = await createWebEnquiry(enquiry);
    expect(lead.notes).toContain("Hotel Yak");
    expect(lead.notes).toContain("Singing Bowl");
    expect(lead.notes).toContain("40");
  });

  it("works before the lookups are seeded", async () => {
    db.leadSources = [];
    const lead = await createWebEnquiry(enquiry);
    // A public form must not 500 because a lookup row was never created.
    expect(lead.sourceId).toBeTruthy();
    expect(db.leadSources).toHaveLength(1);
  });

  it("appends to the open lead instead of double-counting the month", async () => {
    await createWebEnquiry(enquiry);
    // Same buyer, different product, a few days later — and a number written
    // the other way round.
    await createWebEnquiry({
      ...enquiry,
      phone: "+977 98-1234-5678",
      productInterest: "Incense holder",
    });

    expect(db.leads).toHaveLength(1);
    expect(db.leads[0].notes).toContain("Singing Bowl");
    expect(db.leads[0].notes).toContain("Incense holder");
    expect(db.leads[0].notes).toContain("Enquired again");
  });

  it("starts a fresh lead when the last one is closed", async () => {
    await createWebEnquiry(enquiry);
    db.leads[0].status = "purchase";

    await createWebEnquiry(enquiry);
    // That conversation ended; this is a new one, and merging them would hide
    // a repeat customer.
    expect(db.leads).toHaveLength(2);
  });
});
