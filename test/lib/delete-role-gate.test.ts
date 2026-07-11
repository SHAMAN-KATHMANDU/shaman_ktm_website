// Every admin DELETE endpoint must require the editor role — a signed-in
// "viewer" must not be able to destroy content through the API even though
// the UI hides the button. User deletion stays owner-only.

import { describe, expect, it, vi, beforeEach } from "vitest";

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

const callDelete = async (load: RouteLoader, params: object) => {
  const mod = await load();
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

  for (const [name, load, params] of ROUTES) {
    it(`${name}: viewer is forbidden`, async () => {
      currentRole = "viewer";
      expect(await callDelete(load, params)).toBe(403);
    });

    it(`${name}: editor is allowed`, async () => {
      currentRole = "editor";
      expect(await callDelete(load, params)).not.toBe(403);
    });
  }

  it("admin users: editor is forbidden (owner-only)", async () => {
    currentRole = "editor";
    expect(
      await callDelete(
        () => importRoute("@/app/api/sysuser/users/[id]/route"),
        { id: "u2" },
      ),
    ).toBe(403);
  });
});
