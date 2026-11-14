// The member-circle form is anonymous: resubmitting someone's WhatsApp number
// used to overwrite that lead's name and email.

import { describe, expect, it, vi, beforeEach } from "vitest";

let existing: { id: string; email: string | null } | null = null;
const update = vi.fn(async () => ({}));
const create = vi.fn(async () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    memberLead: { findFirst: async () => existing, update, create },
  },
}));

const { POST } = await import("@/app/api/public/v1/member-leads/route");

let n = 0;
const submit = (body: Record<string, unknown>) =>
  POST(
    new Request("http://localhost/api/public/v1/member-leads", {
      method: "POST",
      // A fresh IP each time keeps the IP limiter out of this test.
      headers: { "Content-Type": "application/json", "x-real-ip": `10.9.0.${++n}` },
      body: JSON.stringify(body),
    }),
  );

describe("member lead resubmission", () => {
  beforeEach(() => {
    update.mockClear();
    create.mockClear();
  });

  it("leaves an existing lead's name and email alone", async () => {
    existing = { id: "l1", email: "real@person.test" };
    const res = await submit({
      name: "Attacker",
      whatsapp: "+977 9800000000",
      email: "attacker@evil.test",
    });
    expect(res.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("only fills an email the lead did not have", async () => {
    existing = { id: "l1", email: null };
    await submit({ name: "Other", whatsapp: "+977 9800000000", email: "new@person.test" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { email: "new@person.test" },
    });
  });
});
