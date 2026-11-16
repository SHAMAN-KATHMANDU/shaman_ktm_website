import { describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw } }));
const { GET } = await import("@/app/api/health/route");

describe("/api/health", () => {
  it("is 200 when the database answers", async () => {
    queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("is 503 when the database is down", async () => {
    queryRaw.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect((await GET()).status).toBe(503);
  });
});
