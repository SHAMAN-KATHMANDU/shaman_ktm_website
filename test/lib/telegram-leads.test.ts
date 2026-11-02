// Leads-bot invariants. The bot is an input path onto the CRM tables, never a
// bypass, so:
//   · an unregistered or inactive Telegram user records nothing
//   · NOTHING is written until the staff member sees the lead and confirms it
//   · source and interest stay separate answers — reports group by both
//   · a lead's opening status-history row is written with it, in one go
//   · a number already on file is surfaced before a duplicate is created
//   · the two bots cannot claim each other's updates or sessions
//
// The Telegram HTTP surface is stubbed; the CRM service underneath is the real
// one, running against the in-memory Prisma fake.

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  staff: [] as Row[],
  showrooms: [] as Row[],
  leadSources: [] as Row[],
  leads: [] as Row[],
  history: [] as Row[],
  followups: [] as Row[],
  sessions: [] as Row[],
  updates: [] as Row[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;

// Keeps Dates as Dates — a JSON round-trip would turn them into strings, and
// the duplicate warning formats a real Date.
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

function model(store: () => Row[], opts: { unique?: string[] } = {}) {
  return {
    findUnique: async ({ where }: { where: Row }) => {
      const nested = Object.values(where).find(
        (v) => v && typeof v === "object" && !(v instanceof Date),
      ) as Row | undefined;
      const row = store().find((r) => matches(r, nested ?? where));
      return row ? clone(row) : null;
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = store().find((r) => matches(r, where ?? {}));
      return row ? clone(row) : null;
    },
    findMany: async ({
      where,
      orderBy,
      take,
    }: { where?: Row; orderBy?: Row; take?: number } = {}) => {
      let rows = store().filter((r) => matches(r, where ?? {}));
      const [field, dir] = Object.entries(orderBy ?? {})[0] ?? [];
      if (field) {
        rows = [...rows].sort((a, b) => {
          const av = a[field] as number | string | Date;
          const bv = b[field] as number | string | Date;
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return dir === "desc" ? -cmp : cmp;
        });
      }
      return rows.slice(0, take ?? rows.length).map(clone);
    },
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: Row[];
      skipDuplicates?: boolean;
    }) => {
      let count = 0;
      for (const d of data) {
        const clash = (opts.unique ?? []).some((key) =>
          key.split("+").every((f) => store().some((r) => r[f] === d[f])) &&
          store().some((r) => key.split("+").every((f) => r[f] === d[f])),
        );
        if (clash && skipDuplicates) continue;
        store().push({ id: nextId("row"), ...d });
        count++;
      }
      return { count };
    },
    create: async ({ data }: { data: Row }) => {
      const row: Row = { id: nextId("row"), createdAt: new Date(), ...data };
      store().push(row);
      return clone(row);
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = store().find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      Object.assign(row, data);
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = store().filter((r) => matches(r, where));
      for (const r of rows) Object.assign(r, data);
      return { count: rows.length };
    },
    upsert: async ({ where, update, create }: { where: Row; update: Row; create: Row }) => {
      const nested = Object.values(where).find(
        (v) => v && typeof v === "object" && !(v instanceof Date),
      ) as Row | undefined;
      const row = store().find((r) => matches(r, nested ?? where));
      if (row) {
        Object.assign(row, update);
        return clone(row);
      }
      const created: Row = { id: nextId("row"), ...create };
      store().push(created);
      return clone(created);
    },
    deleteMany: async ({ where }: { where?: Row } = {}) => {
      const keep = store().filter((r) => !matches(r, where ?? {}));
      const n = store().length - keep.length;
      store().length = 0;
      store().push(...keep);
      return { count: n };
    },
  };
}

const client = {
  staff: model(() => db.staff),
  showroom: model(() => db.showrooms),
  leadSource: model(() => db.leadSources),
  crmLead: model(() => db.leads),
  crmLeadStatusHistory: model(() => db.history),
  crmFollowup: model(() => db.followups),
  telegramSession: model(() => db.sessions),
  telegramUpdate: model(() => db.updates, {
    unique: ["bot+chatId+telegramMessageId"],
  }),
};

// Real rollback: a lead and its opening history row are one transaction, and a
// fake that couldn't roll back would hide a half-written lead.
async function fakeTransaction<T>(fn: (tx: typeof client) => Promise<T>): Promise<T> {
  const snap = clone({
    staff: db.staff,
    showrooms: db.showrooms,
    leadSources: db.leadSources,
    leads: db.leads,
    history: db.history,
    followups: db.followups,
    sessions: db.sessions,
    updates: db.updates,
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

const sent: { text: string; buttons: string[] }[] = [];
vi.mock("@/lib/telegram/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telegram/core")>();
  return {
    ...actual,
    sendMessage: async (
      _t: string,
      _c: string,
      text: string,
      buttons?: { text: string; data: string }[][],
    ) => {
      sent.push({ text, buttons: (buttons ?? []).flat().map((b) => b.data) });
    },
    answerCallback: async () => {},
    downloadTelegramFile: async () => ({
      bytes: new Uint8Array([1, 2, 3]),
      mime: "image/jpeg",
    }),
    storeEvidence: async () => "https://media.test/lead-chat.jpg",
  };
});

const { handleLeadUpdate } = await import("@/lib/telegram/lead-flow");
const { claimUpdate, getSession } = await import("@/lib/telegram/core");

const TOKEN = "test-token";
const CHAT = "chat1";
const TG_USER = "tg-555";
const ROOM = "thamel";
const SOURCE = "src_instagram";

let messageId = 0;
const send = (u: Partial<Parameters<typeof handleLeadUpdate>[1]>) =>
  handleLeadUpdate(TOKEN, {
    chatId: CHAT,
    telegramUserId: TG_USER,
    telegramMessageId: ++messageId,
    ...u,
  });

/**
 * Same, but claiming the update first — which is what the route does before it
 * hands anything to the flow. Needed wherever the flow links what it created
 * back to the message that created it.
 */
const sendClaimed = async (u: Partial<Parameters<typeof handleLeadUpdate>[1]>) => {
  const telegramMessageId = ++messageId;
  await claimUpdate({
    bot: "leads",
    chatId: CHAT,
    telegramMessageId,
    telegramUserId: TG_USER,
  });
  return handleLeadUpdate(TOKEN, {
    chatId: CHAT,
    telegramUserId: TG_USER,
    telegramMessageId,
    ...u,
  });
};

const lastText = () => sent[sent.length - 1]?.text ?? "";
const lastButtons = () => sent[sent.length - 1]?.buttons ?? [];

beforeEach(() => {
  db.staff = [
    {
      id: "staff1",
      name: "Sanu",
      active: true,
      telegramUserId: TG_USER,
      defaultShowroomKey: ROOM,
    },
  ];
  db.showrooms = [
    { key: ROOM, name: "Thamel", type: "showroom", active: true, position: 0 },
    { key: "gongabu", name: "Gongabu", type: "showroom", active: true, position: 1 },
  ];
  db.leadSources = [
    { id: SOURCE, label: "Instagram DM", active: true },
    { id: "src_walkin", label: "Walk-in", active: true },
  ];
  db.leads = [];
  db.history = [];
  db.followups = [];
  db.sessions = [];
  db.updates = [];
  db.seq = 0;
  sent.length = 0;
  messageId = 0;
});

/** Walk the whole flow up to (not including) the save press. */
async function walkToConfirm(opts: { phone?: string } = {}) {
  await send({ text: "/lead" });
  await send({ text: "Maya Gurung" });
  await send({ text: opts.phone ?? "9812345678" });
  await send({ callbackData: `src:${SOURCE}` });
  await send({ callbackData: "int:retail" });
  await send({ callbackData: "st:hot" });
  await send({ callbackData: "visit:no" });
  return send({ text: "skip" });
}

describe("identity", () => {
  it("records nothing for an unknown Telegram account", async () => {
    db.staff = [];
    expect(await send({ text: "/lead" })).toBe("unregistered");
    expect(lastText()).toMatch(/don't recognise/i);
    expect(db.sessions).toHaveLength(0);
  });

  it("refuses an inactive staff member", async () => {
    db.staff[0].active = false;
    expect(await send({ text: "/lead" })).toBe("unregistered");
    expect(lastText()).toMatch(/inactive/i);
  });

  it("asks a floater which showroom before anything else", async () => {
    db.staff[0].defaultShowroomKey = null;
    expect(await send({ text: "/lead" })).toBe("lead:asked_showroom");
    expect(lastButtons()).toContain(`room:${ROOM}`);

    expect(await send({ callbackData: "room:gongabu" })).toBe("lead:showroom_set");
    expect((await getSession("leads", TG_USER))?.showroomKey).toBe("gongabu");
  });
});

describe("the /lead flow", () => {
  it("writes one lead, with its opening history row, only on confirm", async () => {
    expect(await walkToConfirm()).toBe("lead:ready");
    // Everything so far lives in the session — the table is still untouched.
    expect(db.leads).toHaveLength(0);

    expect(await sendClaimed({ callbackData: "lead:yes" })).toBe("lead:created");
    expect(db.leads).toHaveLength(1);

    const lead = db.leads[0];
    expect(lead.name).toBe("Maya Gurung");
    expect(lead.phone).toBe("9812345678");
    expect(lead.sourceId).toBe(SOURCE);
    expect(lead.interest).toBe("retail");
    expect(lead.status).toBe("hot");
    expect(lead.showroomKey).toBe(ROOM);
    // Whoever took the enquiry owns the follow-up.
    expect(lead.createdByStaffId).toBe("staff1");
    expect(lead.assignedStaffId).toBe("staff1");

    // The history is complete from the lead's first moment.
    expect(db.history).toHaveLength(1);
    expect(db.history[0].fromStatus).toBeNull();
    expect(db.history[0].toStatus).toBe("hot");

    // The update is traceable back to the message that made it.
    expect(db.updates.at(-1)?.refType).toBe("CrmLead");
    expect(db.updates.at(-1)?.refId).toBe(lead.id);
    // Session finished, so the next /lead starts clean.
    expect(await getSession("leads", TG_USER)).toBeNull();
  });

  it("writes nothing when the lead is discarded", async () => {
    await walkToConfirm();
    expect(await send({ callbackData: "lead:no" })).toBe("lead:discarded");
    expect(db.leads).toHaveLength(0);
    expect(db.history).toHaveLength(0);
    expect(await getSession("leads", TG_USER)).toBeNull();
  });

  it("keeps source and interest as separate answers", async () => {
    await send({ text: "/lead" });
    await send({ text: "Ram" });
    await send({ text: "9800000000" });
    // Instagram DM asking about wholesale: one lead, two different facts.
    await send({ callbackData: `src:${SOURCE}` });
    expect(await send({ callbackData: "int:wholesale_b2b" })).toBe("lead:interest_set");
    await send({ callbackData: "st:warm" });
    await send({ callbackData: "visit:unasked" });
    await send({ text: "skip" });
    await send({ callbackData: "lead:yes" });

    expect(db.leads[0].sourceId).toBe(SOURCE);
    expect(db.leads[0].interest).toBe("wholesale_b2b");
  });

  it("offers only intake statuses — never purchase or dnc", async () => {
    await send({ text: "/lead" });
    await send({ text: "Ram" });
    await send({ text: "9800000000" });
    await send({ callbackData: `src:${SOURCE}` });
    await send({ callbackData: "int:retail" });

    const offered = lastButtons();
    expect(offered).toContain("st:hot");
    expect(offered).toContain("st:cold");
    // "purchase" is set by linking a sale; "dnc" is a later decision. Neither
    // is something to assert while first writing the lead down.
    expect(offered).not.toContain("st:purchase");
    expect(offered).not.toContain("st:dnc");
  });

  it("refuses a number that isn't one, rather than filing an unusable contact", async () => {
    await send({ text: "/lead" });
    await send({ text: "Maya" });
    expect(await send({ text: "call me maybe" })).toBe("lead:phone_invalid");
    expect(lastText()).toMatch(/doesn't look like a phone number/i);
    // Still on the same question, so one bad answer costs one message.
    expect((await getSession("leads", TG_USER))?.step).toBe("collecting_phone");
  });

  it("records the visit date when they say they're coming in", async () => {
    await send({ text: "/lead" });
    await send({ text: "Maya" });
    await send({ text: "9812345678" });
    await send({ callbackData: `src:${SOURCE}` });
    await send({ callbackData: "int:retail" });
    await send({ callbackData: "st:hot" });
    expect(await send({ callbackData: "visit:yes" })).toBe("lead:visit_yes");

    // A date it can't parse is re-asked, never guessed at.
    expect(await send({ text: "next tuesday" })).toBe("lead:visit_date_invalid");
    expect(await send({ text: "2026-08-20" })).toBe("lead:visit_date_set");

    await send({ text: "skip" });
    await send({ callbackData: "lead:yes" });

    expect(db.leads[0].willVisit).toBe(true);
    expect(db.leads[0].askedLocation).toBe(true);
    expect((db.leads[0].visitDate as Date).toISOString()).toBe(
      "2026-08-20T00:00:00.000Z",
    );
  });

  it("retains a screenshot as evidence, and a typed note as a note", async () => {
    await send({ text: "/lead" });
    await send({ text: "Maya" });
    await send({ text: "9812345678" });
    await send({ callbackData: `src:${SOURCE}` });
    await send({ callbackData: "int:retail" });
    await send({ callbackData: "st:hot" });
    await send({ callbackData: "visit:no" });
    await send({ photoFileId: "chat-screenshot" });
    await send({ callbackData: "lead:yes" });

    expect(db.leads[0].evidenceUrl).toBe("https://media.test/lead-chat.jpg");

    // Same step, typed instead of photographed.
    sent.length = 0;
    db.leads.length = 0;
    await walkToConfirmWithNote();
    expect(db.leads[0].notes).toBe("Asked about the large bowls");
    expect(db.leads[0].evidenceUrl).toBeNull();
  });

  async function walkToConfirmWithNote() {
    await send({ text: "/lead" });
    await send({ text: "Bikash" });
    await send({ text: "9800000001" });
    await send({ callbackData: `src:${SOURCE}` });
    await send({ callbackData: "int:retail" });
    await send({ callbackData: "st:warm" });
    await send({ callbackData: "visit:no" });
    await send({ text: "Asked about the large bowls" });
    await send({ callbackData: "lead:yes" });
  }

  it("greets with instructions", async () => {
    expect(await send({ text: "/start" })).toBe("help");
    expect(lastText()).toContain("Sanu");
  });

  it("cancels mid-flow, leaving nothing behind", async () => {
    await send({ text: "/lead" });
    await send({ text: "Maya" });
    expect(await send({ text: "/cancel" })).toBe("cancelled");
    expect(db.leads).toHaveLength(0);
    expect(await getSession("leads", TG_USER)).toBeNull();
  });

  it("treats an expired session as no session", async () => {
    await send({ text: "/lead" });
    db.sessions[0].expiresAt = new Date(Date.now() - 1000);
    expect(await getSession("leads", TG_USER)).toBeNull();
    expect(await send({ text: "anything" })).toBe("no_session");
  });
});

describe("duplicate numbers", () => {
  it("warns when an open lead already has that number, however it was written", async () => {
    db.leads.push({
      id: "lead_old",
      name: "Maya G.",
      // Same person, spelled with separators — the comparison has to see past
      // formatting or the warning would never fire in practice.
      phone: "+977 98-1234-5678",
      status: "warm",
      createdAt: new Date("2026-08-01T00:00:00Z"),
    });

    await send({ text: "/lead" });
    await send({ text: "Maya Gurung" });
    expect(await send({ text: "9812345678" })).toBe("lead:phone_set_duplicate");
    expect(lastText()).toMatch(/already on file/i);

    await send({ callbackData: `src:${SOURCE}` });
    await send({ callbackData: "int:retail" });
    await send({ callbackData: "st:hot" });
    await send({ callbackData: "visit:no" });
    await send({ text: "skip" });
    // Said again at the moment of decision, where it can still be acted on.
    expect(lastText()).toMatch(/adds a second record/i);

    // And it is a warning, not a block: a genuinely new enquiry still saves.
    await send({ callbackData: "lead:yes" });
    expect(db.leads).toHaveLength(2);
  });

  it("says nothing about a closed lead — that conversation is over", async () => {
    db.leads.push({
      id: "lead_done",
      name: "Maya G.",
      phone: "9812345678",
      status: "purchase",
      createdAt: new Date("2026-08-01T00:00:00Z"),
    });
    await send({ text: "/lead" });
    await send({ text: "Maya Gurung" });
    expect(await send({ text: "9812345678" })).toBe("lead:phone_set");
  });
});

describe("two bots, one Telegram account", () => {
  it("does not treat the sales bot's message as the leads bot's retry", async () => {
    // Telegram gives a private chat the user's own id, the same for every bot,
    // and each bot numbers its messages from 1. Without the bot in the key,
    // this second claim would look like a re-delivery and be dropped.
    expect(
      await claimUpdate({
        bot: "sales",
        chatId: CHAT,
        telegramMessageId: 7,
        telegramUserId: TG_USER,
      }),
    ).toBe(true);
    expect(
      await claimUpdate({
        bot: "leads",
        chatId: CHAT,
        telegramMessageId: 7,
        telegramUserId: TG_USER,
      }),
    ).toBe(true);
    expect(db.updates).toHaveLength(2);
  });

  it("still dedups a genuine retry of the same bot's message", async () => {
    const claim = () =>
      claimUpdate({
        bot: "leads",
        chatId: CHAT,
        telegramMessageId: 9,
        telegramUserId: TG_USER,
      });
    expect(await claim()).toBe(true);
    expect(await claim()).toBe(false);
    expect(db.updates).toHaveLength(1);
  });

  it("keeps each bot's half-finished conversation to itself", async () => {
    // A sale scanned but not yet confirmed, on the other bot.
    db.sessions.push({
      id: "sess_sale",
      bot: "sales",
      telegramUserId: TG_USER,
      chatId: CHAT,
      state: { flow: "sale", step: "awaiting_qr", items: [{ productId: "p", qty: 1 }] },
      expiresAt: new Date(Date.now() + 60_000),
    });

    await send({ text: "/lead" });
    await send({ text: "Maya" });

    const sale = await getSession("sales", TG_USER);
    expect(sale?.flow).toBe("sale");
    expect(sale?.items).toHaveLength(1);
    expect((await getSession("leads", TG_USER))?.step).toBe("collecting_phone");
    expect(db.sessions).toHaveLength(2);
  });
});
