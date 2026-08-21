// Every admin DELETE endpoint must require the editor role — a signed-in
// "viewer" must not be able to destroy content through the API even though
// the UI hides the button. User deletion stays owner-only.

import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

const session = { userId: "u1", email: "someone@local.test" };
let currentRole: "owner" | "editor" | "viewer" = "editor";

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => session,
}));

// Deletes resolve to a truthy row so handlers reach their success path; the
// role lookup is what each test actually varies.
const anyRow = {
  id: "x",
  name: "x",
  title: "x",
  slug: "x",
  key: "x",
  fromPath: "/x",
  tokenHash: "x",
};

vi.mock("@/lib/db", () => {
  const model = {
    findUnique: async () => anyRow,
    findFirst: async () => anyRow,
    findMany: async () => [],
    delete: async () => anyRow,
    deleteMany: async () => ({ count: 1 }),
    update: async () => anyRow,
    updateMany: async () => ({ count: 1 }),
    count: async () => 1,
  };
  return {
    prisma: new Proxy(
      {
        adminUser: {
          ...model,
          findUnique: async () => ({ id: "u1", role: currentRole }),
          count: async () => 2,
        },
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : { ...model },
      },
    ),
  };
});

vi.mock("@/lib/audit", () => ({ logAction: () => {} }));
vi.mock("@/lib/s3", () => ({ deleteObject: async () => {} }));
vi.mock("next/cache", () => ({ revalidateTag: () => {} }));

type RouteModule = { DELETE: DeleteHandler };
type RouteLoader = () => Promise<RouteModule>;

// route path → the params object its DELETE handler expects
const ROUTES: Array<[string, RouteLoader, object]> = [
  ["products", () => importRoute("@/app/api/sysuser/products/[id]/route"), { id: "x" }],
  ["categories", () => importRoute("@/app/api/sysuser/categories/[id]/route"), { id: "x" }],
  ["blog posts", () => importRoute("@/app/api/sysuser/blog/posts/[id]/route"), { id: "x" }],
  ["blog categories", () => importRoute("@/app/api/sysuser/blog/categories/[slug]/route"), { slug: "x" }],
  ["blog tags", () => importRoute("@/app/api/sysuser/blog/tags/[name]/route"), { name: "x" }],
  ["pages", () => importRoute("@/app/api/sysuser/pages/[slug]/route"), { slug: "x" }],
  ["collections", () => importRoute("@/app/api/sysuser/collections/[id]/route"), { id: "x" }],
  ["bundles", () => importRoute("@/app/api/sysuser/bundles/[id]/route"), { id: "x" }],
  ["services", () => importRoute("@/app/api/sysuser/services/[slug]/route"), { slug: "x" }],
  ["elements", () => importRoute("@/app/api/sysuser/elements/[slug]/route"), { slug: "x" }],
  ["showrooms", () => importRoute("@/app/api/sysuser/showrooms/[key]/route"), { key: "x" }],
  ["redirects", () => importRoute("@/app/api/sysuser/redirects/[id]/route"), { id: "x" }],
  ["media", () => importRoute("@/app/api/sysuser/media/[id]/route"), { id: "x" }],
  ["reviews", () => importRoute("@/app/api/sysuser/reviews/[id]/route"), { id: "x" }],
];

type DeleteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

// Route modules export more than DELETE (GET/PUT/PATCH with their own param
// shapes) — narrow to just the handler under test.
const importRoute = (spec: string): Promise<RouteModule> =>
  import(/* @vite-ignore */ spec) as Promise<RouteModule>;

// Every route module is imported ONCE, in beforeAll, instead of lazily inside
// whichever test happens to touch it first.
//
// Why it matters: `callDelete` used to `await load()` inside the timed `it()`
// body, so the FIRST test for each route paid that route's module-transform
// cost against the 5000ms per-test default (vitest.config.ts sets no
// testTimeout). Measured on an idle machine before this change:
//
//     products: viewer is forbidden   2948ms   <- 59% of the whole budget
//     products: editor is allowed        9ms
//     media:    viewer is forbidden    711ms
//     media:    editor is allowed        3ms
//
// Every "viewer is forbidden" case — always the first test for its route — ran
// 10x to 300x slower than the identical "editor is allowed" case beside it.
// That is the import, not the assertion. Under parallel load a 1.7x slowdown
// on the products case alone crosses 5000ms, which is exactly the
// "Test timed out in 5000ms" this file produced on two branches.
//
// Hoisting moves the cost out of the per-test budget. The hook gets an
// explicit generous timeout so the flake is removed rather than relocated
// into the hook's own 10s default.
const modules = new Map<string, RouteModule>();
const USERS_ROUTE = "admin users";

beforeAll(async () => {
  const loaded = await Promise.all(
    ROUTES.map(async ([name, load]) => [name, await load()] as const),
  );
  for (const [name, mod] of loaded) modules.set(name, mod);
  modules.set(
    USERS_ROUTE,
    await importRoute("@/app/api/sysuser/users/[id]/route"),
  );
}, 60_000);

const callDelete = async (name: string, params: object) => {
  const mod = modules.get(name);
  if (!mod) {
    // Guards the hoist itself: a route added to ROUTES but missed by the hook
    // would otherwise fail with an unhelpful "cannot read DELETE of undefined".
    throw new Error(`route module "${name}" was not loaded in beforeAll`);
  }
  const res = await mod.DELETE(
    new Request("http://localhost/api/sysuser/x", { method: "DELETE" }),
    { params: Promise.resolve(params as Record<string, string>) },
  );
  return res.status;
};

describe("admin DELETE endpoints require the editor role", () => {
  beforeEach(() => {
    currentRole = "editor";
  });

  for (const [name, , params] of ROUTES) {
    it(`${name}: viewer is forbidden`, async () => {
      currentRole = "viewer";
      expect(await callDelete(name, params)).toBe(403);
    });

    it(`${name}: editor is allowed`, async () => {
      currentRole = "editor";
      expect(await callDelete(name, params)).not.toBe(403);
    });
  }

  it("admin users: editor is forbidden (owner-only)", async () => {
    currentRole = "editor";
    expect(await callDelete(USERS_ROUTE, { id: "u2" })).toBe(403);
  });
});
