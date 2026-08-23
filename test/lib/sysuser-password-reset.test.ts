// The admin password-reset flow, end to end through the link that is emailed.
//
// This exists because the flow was 100% built and 0% reachable. On
// origin/main @ 8394862:
//   • proxy.ts allow-listed `/sysuser/reset` as a public page,
//   • POST /api/sysuser/auth/request-reset minted and stored a token,
//   • POST /api/sysuser/auth/reset consumed it,
//   • …and there was no app/sysuser/reset/page.tsx, no link from the login
//     form, and no call to lib/email in the admin request-reset route. Outside
//     development the token existed only as a bcrypt hash in Postgres, visible
//     to nobody. A locked-out admin had no route back in.
//
// Nothing failed loudly, because no test asserted that the pieces joined up.
// So this test asserts the JOIN: it captures the URL the API actually emails,
// parses it the way the page parses it, and feeds those values back into the
// reset endpoint.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

// ─── Fakes ───────────────────────────────────────────────────────────────────

const USER = {
  id: "adm_1",
  email: "owner@shamankathmandu.com",
  name: "Owner",
};

interface TokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

let tokens: TokenRow[] = [];
let seq = 0;
let passwordHash = "";
const sent: { to: string; subject: string; html: string }[] = [];

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    // Capture instead of send; the real template is kept so the URL under
    // test is the one a real recipient would click.
    sendEmail: async (args: { to: string; subject: string; html: string }) => {
      sent.push(args);
    },
  };
});

vi.mock("@/lib/audit", () => ({ logAction: () => {} }));

vi.mock("@/lib/db", () => ({
  prisma: {
    adminUser: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
        where.email === USER.email || where.id === USER.id ? USER : null,
      update: async ({ data }: { data: { passwordHash: string } }) => {
        passwordHash = data.passwordHash;
        return USER;
      },
    },
    passwordResetToken: {
      count: async ({ where }: { where: { userId: string } }) =>
        tokens.filter((t) => t.userId === where.userId).length,
      create: async ({ data }: { data: Omit<TokenRow, "id" | "consumedAt" | "createdAt"> }) => {
        const row: TokenRow = {
          id: `tok_${++seq}`,
          consumedAt: null,
          createdAt: new Date(),
          ...data,
        };
        tokens.push(row);
        return row;
      },
      findMany: async ({ where }: { where: { userId: string } }) =>
        tokens.filter(
          (t) =>
            t.userId === where.userId &&
            t.consumedAt === null &&
            t.expiresAt > new Date(),
        ),
      update: async ({ where }: { where: { id: string } }) => {
        const t = tokens.find((r) => r.id === where.id);
        if (t) t.consumedAt = new Date();
        return t;
      },
      updateMany: async ({ where }: { where: { userId: string } }) => {
        let count = 0;
        for (const t of tokens) {
          if (t.userId === where.userId && t.consumedAt === null) {
            t.consumedAt = new Date();
            count++;
          }
        }
        return { count };
      },
    },
    // The reset handler wraps its writes in $transaction([...]); the promises
    // are already in flight by the time it is called, so awaiting them all is
    // an accurate stand-in for this test's purposes.
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  tokens = [];
  sent.length = 0;
  passwordHash = "";
});

// ─── The join ────────────────────────────────────────────────────────────────

describe("admin reset link round-trip", () => {
  it("emails a link the page can parse, and that link resets the password", async () => {
    const { POST: requestReset } = await import(
      "@/app/api/sysuser/auth/request-reset/route"
    );
    const { POST: doReset } = await import("@/app/api/sysuser/auth/reset/route");

    const res = await requestReset(
      post("https://shamankathmandu.com/api/sysuser/auth/request-reset", {
        email: USER.email,
      }),
    );
    expect(res.status).toBe(200);

    // 1. A mail actually went out, to the admin, and only to them.
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(USER.email);

    // 2. It contains a link to THIS app's admin reset page. The template
    //    HTML-escapes the href, so the query separator arrives as `&amp;` —
    //    correct HTML, which a browser decodes back to `&` before navigating.
    //    Decode it here for the same reason; parsing the raw attribute would
    //    yield a parameter literally named "amp;token".
    const rawHref = sent[0].html.match(/href="([^"]+)"/)?.[1];
    expect(rawHref, "no link in the reset email").toBeTruthy();
    expect(rawHref).toContain("&amp;");
    const url = new URL(rawHref!.replaceAll("&amp;", "&"));
    expect(url.pathname).toBe("/sysuser/reset");

    // 3. Parsed exactly the way app/sysuser/reset/page.tsx parses it.
    const uid = url.searchParams.get("uid");
    const token = url.searchParams.get("token");
    expect(uid).toBe(USER.id);
    expect(token).toBeTruthy();

    // 4. Those values satisfy the reset endpoint. This is the assertion the
    //    repo was missing: request-reset and reset agreeing on one contract.
    const done = await doReset(
      post("https://shamankathmandu.com/api/sysuser/auth/reset", {
        userId: uid,
        token,
        newPassword: "Correct-Horse-99!",
      }),
    );
    expect(done.status).toBe(200);
    expect(passwordHash).not.toBe("");

    // 5. The token is single-use.
    const replay = await doReset(
      post("https://shamankathmandu.com/api/sysuser/auth/reset", {
        userId: uid,
        token,
        newPassword: "Another-Horse-99!",
      }),
    );
    expect(replay.status).toBe(400);
  }, 30_000);

  it("does not mail anything for an unknown address, and stays opaque", async () => {
    const { POST: requestReset } = await import(
      "@/app/api/sysuser/auth/request-reset/route"
    );
    const res = await requestReset(
      post("https://shamankathmandu.com/api/sysuser/auth/request-reset", {
        email: "nobody@example.com",
      }),
    );
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });
});

// ─── The reachability the flow was missing ───────────────────────────────────

describe("/sysuser/reset is reachable", () => {
  it("has a page (an allow-listed path with no page is a 404 for a locked-out admin)", () => {
    expect(existsSync("app/sysuser/reset/page.tsx")).toBe(true);
  });

  it("is allow-listed in proxy.ts for a visitor with no session", () => {
    const req = new NextRequest(
      new URL("https://example.test/sysuser/reset?uid=a&token=b"),
    );
    const res = proxy(req);
    // Not a redirect to /sysuser/login — the whole point is that you get here
    // precisely when you cannot log in.
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
  });

  it("is linked from the login page", () => {
    const src = readFileSync("app/sysuser/login/page.tsx", "utf8");
    expect(src).toMatch(/href="\/sysuser\/reset"/);
  });

  it("uses the same ?uid=&token= parameter names as the customer flow", () => {
    const admin = readFileSync("app/sysuser/reset/page.tsx", "utf8");
    const customer = readFileSync("app/account/reset/page.tsx", "utf8");
    for (const src of [admin, customer]) {
      expect(src).toMatch(/get\("uid"\)/);
      expect(src).toMatch(/get\("token"\)/);
    }
  });
});
