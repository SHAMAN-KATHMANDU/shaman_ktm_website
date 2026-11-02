// CRM invariants. The spec's whole anti-fabrication argument rests on these:
//   · a lead cannot exist without an opening, attributed history row
//   · a status never moves without a dated history row in the same transaction
//   · terminal leads (purchase / dnc) are not silently re-triaged
//   · period figures are DERIVED counts, never a typed tally
//   · promoting a Member Circle signup is one-way and one-time
//
// Prisma is faked in memory (the suite has no database). The fake enforces the
// one thing these tests are really about: whether the service wrote the history
// row alongside the status change.

import { describe, expect, it, beforeEach, vi } from "vitest";

interface LeadRec {
  id: string;
  name: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  sourceId: string;
  interest: string;
  status: string;
  askedLocation: boolean;
  willVisit: boolean;
  visitDate: Date | null;
  followUpDate: Date | null;
  assignedStaffId: string | null;
  showroomKey: string | null;
  linkedSaleId: string | null;
  linkedB2bAccountId: string | null;
  notes: string | null;
  evidenceUrl: string | null;
  createdByStaffId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface HistoryRec {
  id: string;
  leadId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByStaffId: string;
  note: string | null;
  createdAt: Date;
}
interface FollowupRec {
  id: string;
  leadId: string;
  staffId: string;
  followupAt: Date;
  channel: string;
  gotResponse: boolean;
  notes: string | null;
  createdAt: Date;
}

const db = {
  leads: [] as LeadRec[],
  history: [] as HistoryRec[],
  followups: [] as FollowupRec[],
  sources: [] as { id: string; label: string; active: boolean }[],
  staff: [] as { id: string; name: string; active: boolean }[],
  showrooms: [] as { key: string; type: string; active: boolean }[],
  memberLeads: [] as {
    id: string;
    name: string;
    whatsapp: string;
    email: string | null;
    note: string | null;
  }[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;

function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (v && typeof v === "object" && "contains" in (v as object)) {
      const needle = String((v as { contains: string }).contains);
      return String(row[k] ?? "").includes(needle);
    }
    return row[k] === v;
  });
}

const client = {
  leadSource: {
    findUnique: async ({ where }: { where: { id?: string; label?: string } }) =>
      db.sources.find(
        (s) => (where.id && s.id === where.id) || (where.label && s.label === where.label),
      ) ?? null,
    findMany: async () => db.sources,
  },
  staff: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.staff.find((s) => s.id === where.id) ?? null,
    findMany: async () => db.staff,
  },
  showroom: {
    findUnique: async ({ where }: { where: { key: string } }) =>
      db.showrooms.find((s) => s.key === where.key) ?? null,
    findFirst: async ({ where }: { where: { key: string; type?: string; active?: boolean } }) =>
      db.showrooms.find(
        (s) => s.key === where.key &&
          (where.type === undefined || s.type === where.type) &&
          (where.active === undefined || s.active === where.active),
      ) ?? null,
    findMany: async () => db.showrooms,
  },
  crmLead: {
    create: async ({ data }: { data: Omit<LeadRec, "id" | "createdAt" | "updatedAt"> }) => {
      const row: LeadRec = {
        id: nextId("lead"),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      db.leads.push(row);
      return { ...row };
    },
    // Reads return DETACHED copies, like real Prisma — a later update() must
    // not retroactively change what an earlier read observed.
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = db.leads.find((l) => l.id === where.id);
      return row ? { ...row } : null;
    },
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      const row = db.leads.find((l) =>
        matches(l as unknown as Record<string, unknown>, where),
      );
      return row ? { ...row } : null;
    },
    findMany: async () => db.leads.map((l) => ({ ...l })),
    count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
      db.leads.filter((l) =>
        matches(l as unknown as Record<string, unknown>, where ?? {}),
      ).length,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<LeadRec>;
    }) => {
      const row = db.leads.find((l) => l.id === where.id);
      if (!row) throw new Error("lead not found in fake");
      Object.assign(row, data, { updatedAt: new Date() });
      return { ...row };
    },
    groupBy: async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const rows = db.leads.filter((l) =>
        matches(l as unknown as Record<string, unknown>, where ?? {}),
      );
      const byStatus = new Map<string, number>();
      for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
      return [...byStatus].map(([status, n]) => ({ status, _count: { _all: n } }));
    },
  },
  crmLeadStatusHistory: {
    create: async ({ data }: { data: Omit<HistoryRec, "id" | "createdAt"> }) => {
      const row: HistoryRec = { id: nextId("hist"), createdAt: new Date(), ...data };
      db.history.push(row);
      return row;
    },
  },
  crmFollowup: {
    create: async ({ data }: { data: Omit<FollowupRec, "id" | "createdAt"> }) => {
      const row: FollowupRec = { id: nextId("fu"), createdAt: new Date(), ...data };
      db.followups.push(row);
      return row;
    },
  },
  memberLead: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.memberLeads.find((m) => m.id === where.id) ?? null,
  },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    ...client,
    $transaction: async (fn: (tx: typeof client) => unknown) => fn(client),
  },
}));

const {
  createLead,
  changeLeadStatus,
  reopenLead,
  addFollowup,
  countLeadsByStatus,
  promoteMemberLead,
} = await import("@/lib/crm");
const { CmsError } = await import("@/lib/cms/errors");

const SOURCE = "src_whatsapp";
const STAFF = "staff_sanu";
const OTHER_STAFF = "staff_deepak";

beforeEach(() => {
  db.leads = [];
  db.history = [];
  db.followups = [];
  db.sources = [
    { id: SOURCE, label: "WhatsApp", active: true },
    { id: "src_website", label: "Website", active: true },
  ];
  db.staff = [
    { id: STAFF, name: "Sanu", active: true },
    { id: OTHER_STAFF, name: "Deepak", active: true },
  ];
  db.showrooms = [
    { key: "thamel", type: "showroom", active: true },
    { key: "gongabu", type: "showroom", active: true },
  ];
  db.memberLeads = [
    {
      id: "ml_1",
      name: "Rita",
      whatsapp: "+9779800000001",
      email: "rita@example.com",
      note: "wants a bowl",
    },
  ];
  db.seq = 0;
});

const newLead = (over: Partial<Parameters<typeof createLead>[0]> = {}) =>
  createLead(
    {
      name: "Bikash",
      phone: "+9779812345678",
      sourceId: SOURCE,
      interest: "retail",
      ...over,
    },
    STAFF,
  );

describe("createLead", () => {
  it("writes an opening history row attributed to the author", async () => {
    const lead = await newLead();
    expect(lead.status).toBe("new");
    expect(lead.createdByStaffId).toBe(STAFF);

    const history = db.history.filter((h) => h.leadId === lead.id);
    expect(history).toHaveLength(1);
    // fromStatus null is how a creation row is identified.
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe("new");
    expect(history[0].changedByStaffId).toBe(STAFF);
  });

  it("server-stamps createdAt rather than trusting input", async () => {
    const before = Date.now();
    const lead = await newLead();
    expect(lead.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("honours an explicit opening status in the history row", async () => {
    const lead = await newLead({ status: "hot" });
    expect(lead.status).toBe("hot");
    expect(db.history.at(-1)?.toStatus).toBe("hot");
  });

  it("rejects an unknown interest, status, source, or staff", async () => {
    // @ts-expect-error deliberately invalid
    await expect(newLead({ interest: "curious" })).rejects.toThrow(CmsError);
    // @ts-expect-error deliberately invalid
    await expect(newLead({ status: "lukewarm" })).rejects.toThrow(CmsError);
    await expect(newLead({ sourceId: "nope" })).rejects.toThrow(CmsError);
    await expect(
      createLead(
        { name: "X", phone: "+977", sourceId: SOURCE, interest: "retail" },
        "ghost_staff",
      ),
    ).rejects.toThrow(CmsError);
  });

  it("rejects an unknown showroom or assignee", async () => {
    await expect(newLead({ showroomKey: "pokhara" })).rejects.toThrow(CmsError);
    await expect(newLead({ assignedStaffId: "ghost" })).rejects.toThrow(CmsError);
  });
});

describe("changeLeadStatus", () => {
  it("appends a dated row for every move and keeps the chain contiguous", async () => {
    const lead = await newLead();
    await changeLeadStatus({
      leadId: lead.id,
      toStatus: "hot",
      changedByStaffId: OTHER_STAFF,
      note: "called back",
    });
    await changeLeadStatus({
      leadId: lead.id,
      toStatus: "warm",
      changedByStaffId: STAFF,
    });

    const history = db.history.filter((h) => h.leadId === lead.id);
    expect(history.map((h) => [h.fromStatus, h.toStatus])).toEqual([
      [null, "new"],
      ["new", "hot"],
      ["hot", "warm"],
    ]);
    expect(history[1].changedByStaffId).toBe(OTHER_STAFF);
    expect(history[1].note).toBe("called back");
    expect(db.leads.find((l) => l.id === lead.id)?.status).toBe("warm");
  });

  it("rejects a no-op move and leaves no history row", async () => {
    const lead = await newLead();
    const before = db.history.length;
    await expect(
      changeLeadStatus({
        leadId: lead.id,
        toStatus: "new",
        changedByStaffId: STAFF,
      }),
    ).rejects.toThrow(/already/i);
    expect(db.history).toHaveLength(before);
  });

  it("will not silently re-triage a converted or do-not-contact lead", async () => {
    for (const terminal of ["purchase", "dnc"] as const) {
      const lead = await newLead({ status: terminal });
      await expect(
        changeLeadStatus({
          leadId: lead.id,
          toStatus: "hot",
          changedByStaffId: STAFF,
        }),
      ).rejects.toThrow(/reopen it explicitly/i);
      expect(db.leads.find((l) => l.id === lead.id)?.status).toBe(terminal);
    }
  });

  it("rejects an unknown status and an unknown actor", async () => {
    const lead = await newLead();
    await expect(
      // @ts-expect-error deliberately invalid
      changeLeadStatus({ leadId: lead.id, toStatus: "maybe", changedByStaffId: STAFF }),
    ).rejects.toThrow(CmsError);
    await expect(
      changeLeadStatus({
        leadId: lead.id,
        toStatus: "hot",
        changedByStaffId: "ghost",
      }),
    ).rejects.toThrow(CmsError);
  });

  it("rejects an unknown lead", async () => {
    await expect(
      changeLeadStatus({
        leadId: "missing",
        toStatus: "hot",
        changedByStaffId: STAFF,
      }),
    ).rejects.toThrow(CmsError);
  });
});

describe("reopenLead", () => {
  it("moves a terminal lead and records the reopen as its own row", async () => {
    const lead = await newLead({ status: "purchase" });
    await reopenLead({
      leadId: lead.id,
      toStatus: "warm",
      changedByStaffId: STAFF,
    });
    const last = db.history.filter((h) => h.leadId === lead.id).at(-1);
    expect(last).toMatchObject({ fromStatus: "purchase", toStatus: "warm" });
    expect(last?.note).toBe("Reopened");
  });

  it("refuses on a non-terminal lead, and refuses to reopen into a terminal", async () => {
    const active = await newLead({ status: "hot" });
    await expect(
      reopenLead({ leadId: active.id, toStatus: "warm", changedByStaffId: STAFF }),
    ).rejects.toThrow(/not a terminal status/i);

    const done = await newLead({ status: "dnc" });
    await expect(
      reopenLead({ leadId: done.id, toStatus: "purchase", changedByStaffId: STAFF }),
    ).rejects.toThrow(/non-terminal/i);
  });
});

describe("addFollowup", () => {
  it("logs the channel, the responder, and whether they replied", async () => {
    const lead = await newLead();
    const fu = await addFollowup({
      leadId: lead.id,
      staffId: STAFF,
      channel: "whatsapp",
      gotResponse: true,
      notes: "asked for photos",
    });
    expect(fu).toMatchObject({
      leadId: lead.id,
      staffId: STAFF,
      channel: "whatsapp",
      gotResponse: true,
    });
    expect(fu.followupAt).toBeInstanceOf(Date);
  });

  it("rejects an unknown channel, lead, or staff member", async () => {
    const lead = await newLead();
    await expect(
      // @ts-expect-error deliberately invalid
      addFollowup({ leadId: lead.id, staffId: STAFF, channel: "pigeon" }),
    ).rejects.toThrow(CmsError);
    await expect(
      addFollowup({ leadId: "missing", staffId: STAFF, channel: "call" }),
    ).rejects.toThrow(CmsError);
    await expect(
      addFollowup({ leadId: lead.id, staffId: "ghost", channel: "call" }),
    ).rejects.toThrow(CmsError);
  });
});

describe("countLeadsByStatus", () => {
  it("derives the period figure from rows, with every bucket present", async () => {
    await newLead();
    await newLead({ status: "hot" });
    await newLead({ status: "hot" });
    await newLead({ status: "warm" });

    const counts = await countLeadsByStatus();
    // This is the "New sms – 10, Warm – 3" number: a query, not a typed tally.
    expect(counts).toEqual({
      new: 1,
      hot: 2,
      warm: 1,
      cold: 0,
      purchase: 0,
      dnc: 0,
    });
  });
});

describe("promoteMemberLead", () => {
  it("copies a signup into the CRM and leaves the original queue row intact", async () => {
    const lead = await promoteMemberLead({
      memberLeadId: "ml_1",
      createdByStaffId: STAFF,
    });
    expect(lead.name).toBe("Rita");
    expect(lead.phone).toBe("+9779800000001");
    expect(lead.interest).toBe("retail");
    // Traceable back to its origin, and the MemberLead row still exists.
    expect(lead.notes).toContain("member-lead:ml_1");
    expect(db.memberLeads).toHaveLength(1);
    // Promotion goes through createLead, so it gets an opening history row too.
    expect(db.history.filter((h) => h.leadId === lead.id)).toHaveLength(1);
  });

  it("refuses a second promotion of the same signup", async () => {
    await promoteMemberLead({ memberLeadId: "ml_1", createdByStaffId: STAFF });
    await expect(
      promoteMemberLead({ memberLeadId: "ml_1", createdByStaffId: STAFF }),
    ).rejects.toThrow(/already promoted/i);
    expect(db.leads).toHaveLength(1);
  });

  it("rejects an unknown signup", async () => {
    await expect(
      promoteMemberLead({ memberLeadId: "missing", createdByStaffId: STAFF }),
    ).rejects.toThrow(CmsError);
  });
});
