// Owner-only admin SCREENS must be gated on the server, not only in the nav.
//
// The sibling lint test/lib/route-guards.test.ts pins the API boundary. This
// one pins the page boundary, which was missing entirely: `git grep -E
// "requireRole|getSession" -- 'app/sysuser/**'` returned zero hits on
// origin/main @ 8394862. The only thing keeping a viewer off /sysuser/users
// was that components/sysuser/admin-shell.tsx declines to draw the link —
// presentation, not a gate. Typing the address worked.
//
// It is written as a lint over the real files (like route-guards.test.ts) so
// it cannot be satisfied by a unit test that stubs the gate away, and so a new
// owner-only API automatically drags its screen into scope.

import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const PAGES_ROOT = "app/sysuser/(authed)";
const API_ROOT = "app/api/sysuser";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * Admin sections whose API is owner-only. Derived from the route files rather
 * than hardcoded, so relaxing or adding an owner gate on the API side changes
 * what this test demands of the pages.
 */
function ownerOnlyApiSections(): string[] {
  const sections = new Set<string>();
  for (const file of walk(API_ROOT)) {
    if (!file.endsWith("route.ts")) continue;
    if (!/requireRole\("owner"\)/.test(readFileSync(file, "utf8"))) continue;
    // app/api/sysuser/<section>/… -> <section>
    const section = file.slice(API_ROOT.length + 1).split("/")[0];
    sections.add(section);
  }
  return [...sections].sort();
}

/** Sections that have no /sysuser page of their own, so nothing to gate. */
const API_ONLY_SECTIONS = new Set([
  // Managed from the MCP Connections screen (viewer+ to view, owner to revoke,
  // enforced per-handler); there is no /sysuser/oauth-clients page.
  "oauth-clients",
  // /sysuser/mcp-tokens itself is viewer+ by design — it shows the endpoint to
  // paste into a client. Only the per-token revoke API is owner-only, and the
  // page hides that control. Gating the whole page would be a regression.
  "mcp-tokens",
]);

describe("owner-only admin pages are gated on the server", () => {
  const sections = ownerOnlyApiSections().filter(
    (s) => !API_ONLY_SECTIONS.has(s),
  );

  it("finds the owner-only sections it expects", () => {
    // Guards against the derivation silently matching nothing.
    expect(sections).toEqual(["activity", "oauth-consent", "users"]);
  });

  for (const section of ["activity", "oauth-consent", "users"]) {
    const page = join(PAGES_ROOT, section, "page.tsx");

    it(`${section}: page.tsx exists and is a Server Component`, () => {
      expect(existsSync(page)).toBe(true);
      const src = readFileSync(page, "utf8");
      // A "use client" page cannot read the session, so it cannot gate.
      expect(src.startsWith('"use client"')).toBe(false);
    });

    it(`${section}: page.tsx gates on the owner role`, () => {
      const src = readFileSync(page, "utf8");
      expect(src).toMatch(/<RoleGate\b/);
      expect(src).toMatch(/min="owner"/);
    });
  }
});

describe("the page gate is load-bearing, not redundant", () => {
  // If the edge ever starts role-gating /sysuser/*, this test should be
  // revisited — but it does not today, and that is precisely why the page
  // gate has to exist.
  function signedIn(path: string) {
    const r = new NextRequest(new URL(`https://example.test${path}`), {
      method: "GET",
    });
    r.cookies.set("sk_sysuser", "any-opaque-cookie-value");
    return r;
  }

  it("proxy() admits ANY signed-in role to /sysuser/users", () => {
    const res = proxy(signedIn("/sysuser/users"));
    // x-middleware-next: 1 is NextResponse.next() — passed straight through.
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("proxy() still redirects an anonymous visitor to the login page", () => {
    const r = new NextRequest(new URL("https://example.test/sysuser/users"));
    const res = proxy(r);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sysuser/login");
  });
});

describe("pageRoleAtLeast mirrors requireRole", () => {
  it("admits at-or-above, refuses below, and refuses a dangling session", async () => {
    let row: { role: string } | null = { role: "viewer" };
    let userId: string | undefined = "u1";

    vi.doMock("@/lib/auth/session", () => ({
      getSession: async () => ({ userId }),
    }));
    vi.doMock("@/lib/db", () => ({
      prisma: { adminUser: { findUnique: async () => row } },
    }));

    const { getPageRole, pageRoleAtLeast } = await import(
      "@/lib/auth/page-guard"
    );

    row = { role: "owner" };
    expect(await pageRoleAtLeast("owner")).toBe(true);

    row = { role: "editor" };
    expect(await pageRoleAtLeast("owner")).toBe(false);
    expect(await pageRoleAtLeast("editor")).toBe(true);

    // Unknown/missing role falls back to least privilege, same as requireRole.
    row = { role: null as unknown as string };
    expect(await getPageRole()).toBe("staff");

    // Session pointing at a deleted AdminUser row.
    row = null;
    expect(await getPageRole()).toBeNull();
    expect(await pageRoleAtLeast("viewer")).toBe(false);

    // No session at all.
    row = { role: "owner" };
    userId = undefined;
    expect(await getPageRole()).toBeNull();
    expect(await pageRoleAtLeast("viewer")).toBe(false);

    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/db");
  });
});
