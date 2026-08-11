// Every /api/sysuser route is gated, and gated at the right level.
//
// This exists because the boundary silently didn't hold. `staff` was added as a
// restricted role for shop-floor people and documented as "reporting entry
// only — cannot modify products or pages", but 44 route files still used
// adminGuard(), which checks authentication and nothing else. A staff (or
// viewer) login could edit the catalogue, delete blog posts and rewrite site
// config. Nothing failed, because no test asserted the boundary — only a
// comment claimed it.
//
// So this reads the routes themselves. It is a lint, not a mock: it cannot be
// satisfied by a passing unit test that stubs the guard away.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "app/api/sysuser";
const WRITE_METHODS = ["POST", "PATCH", "PUT", "DELETE"] as const;

/**
 * Endpoints that must be reachable WITHOUT a session, by definition — you
 * cannot require a login to log in. Each guards itself internally.
 */
const PUBLIC_AUTH_ROUTES = new Set([
  "auth/login",
  "auth/logout",
  "auth/reset",
  "auth/request-reset",
  "auth/change-password",
  // "Who am I" — every role needs it (the admin shell filters nav by the role
  // it returns), and it 401s without a session. requireRole("viewer") would
  // work, but a role floor on the endpoint that REPORTS your role is circular.
  "auth/me",
]);

/**
 * Operations routes: recording work IS a staff member's job, so writes here are
 * staff+ rather than editor+. Everything not listed is content or config, where
 * a write must be editor+.
 */
const OPERATIONS = [
  "crm",
  "sales",
  "stock/transfers",
  "b2b",
  "footfall",
  "marketing",
  "delivery",
  "orders",
  "member-leads",
];

/** Anything about admin accounts or the audit trail is owner-only. */
const OWNER_ONLY = ["users", "activity"];

const RANK = { viewer: 1, staff: 2, editor: 3, owner: 4 } as const;
type Role = keyof typeof RANK;

interface Handler {
  route: string;
  method: string;
  role: Role | null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (entry === "route.ts") out.push(p);
  }
  return out;
}

/** Every exported handler, with the role its guard demands. */
function handlers(): Handler[] {
  const found: Handler[] = [];
  for (const file of walk(ROOT)) {
    const route = file.slice(ROOT.length + 1).replace(/\/route\.ts$/, "");
    const src = readFileSync(file, "utf8");
    let current: string | null = null;
    for (const line of src.split("\n")) {
      const m = /export async function (GET|POST|PATCH|PUT|DELETE)/.exec(line);
      if (m) {
        current = m[1];
        found.push({ route, method: m[1], role: null });
      }
      const g = /requireRole\("(\w+)"\)/.exec(line);
      if (g && current) {
        const last = found[found.length - 1];
        // First guard wins; a handler shouldn't have two.
        if (last && last.method === current && last.role === null) {
          last.role = g[1] as Role;
        }
      }
    }
  }
  return found;
}

const inGroup = (route: string, group: string[]) =>
  group.some((g) => route === g || route.startsWith(`${g}/`));

describe("admin route guards", () => {
  const all = handlers();

  it("finds the routes at all (guards against a silently empty sweep)", () => {
    expect(all.length).toBeGreaterThan(80);
  });

  it("gates every handler except the auth endpoints", () => {
    const ungated = all.filter(
      (h) => h.role === null && !PUBLIC_AUTH_ROUTES.has(h.route),
    );
    expect(
      ungated.map((h) => `${h.method} ${h.route}`),
      "every admin handler must call requireRole",
    ).toEqual([]);
  });

  it("keeps content and config writes at editor or above", () => {
    const tooOpen = all.filter(
      (h) =>
        h.role !== null &&
        (WRITE_METHODS as readonly string[]).includes(h.method) &&
        !inGroup(h.route, OPERATIONS) &&
        RANK[h.role] < RANK.editor,
    );
    // A shop-floor login must not be able to rewrite the catalogue.
    expect(
      tooOpen.map((h) => `${h.method} ${h.route} = ${h.role}`),
      "content/config writes must be editor+",
    ).toEqual([]);
  });

  it("keeps admin accounts and the audit trail owner-only", () => {
    const leaky = all.filter(
      (h) =>
        h.role !== null && inGroup(h.route, OWNER_ONLY) && h.role !== "owner",
    );
    // The user list carries every admin's email, role and Telegram id.
    expect(
      leaky.map((h) => `${h.method} ${h.route} = ${h.role}`),
      "user management and activity are owner-only",
    ).toEqual([]);
  });

  it("never leaves a write open to a plain viewer", () => {
    const viewerWrites = all.filter(
      (h) =>
        h.role === "viewer" &&
        (WRITE_METHODS as readonly string[]).includes(h.method),
    );
    expect(viewerWrites.map((h) => `${h.method} ${h.route}`)).toEqual([]);
  });

  it("has no route still relying on bare authentication", () => {
    const stale: string[] = [];
    for (const file of walk(ROOT)) {
      const src = readFileSync(file, "utf8");
      // adminGuard() checks a session and nothing more. requireRole() wraps it,
      // so a direct call is the pattern this test was written to stamp out.
      if (/await adminGuard\(\)/.test(src)) {
        stale.push(file.slice(ROOT.length + 1));
      }
    }
    expect(stale).toEqual([]);
  });
});
