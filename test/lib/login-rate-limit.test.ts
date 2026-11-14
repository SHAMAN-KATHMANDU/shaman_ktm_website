// The admin login lock was keyed on email alone (anyone could lock the owner
// out) and counted log rows written fire-and-forget after the check, so a
// burst of parallel guesses all saw a count of zero.

import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyPassword = vi.fn(async () => false);
vi.mock("@/lib/auth/password", () => ({ verifyPassword }));
vi.mock("@/lib/auth/session", () => ({
  clearSession: async () => {},
  setSession: async () => {},
}));
const logAction = vi.fn(async () => {});
vi.mock("@/lib/audit", () => ({ logAction }));

const count = vi.fn(async () => 0);
vi.mock("@/lib/db", () => ({
  prisma: {
    adminLog: { count },
    adminUser: {
      findUnique: async () => ({ id: "u1", email: "owner@local.test", passwordHash: "x" }),
      update: async () => ({}),
    },
  },
}));

const { POST } = await import("@/app/api/sysuser/auth/login/route");

const login = (ip: string, email = "owner@local.test") =>
  POST(
    new Request("http://localhost/api/sysuser/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": ip },
      body: JSON.stringify({ email, password: "guess" }),
    }),
  );

describe("admin login limiter", () => {
  beforeEach(() => {
    verifyPassword.mockClear();
    count.mockClear();
  });

  it("stops a parallel burst before verifying more passwords", async () => {
    const res = await Promise.all(Array.from({ length: 15 }, () => login("7.7.7.7")));
    expect(res.filter((r) => r.status === 429).length).toBe(5);
    expect(verifyPassword).toHaveBeenCalledTimes(10);
  });

  it("does not lock the same email out for a different IP", async () => {
    expect((await login("8.8.8.8")).status).toBe(401);
  });

  it("counts persisted failures for this email and IP only, and records the IP", async () => {
    await login("9.9.9.9");
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        actor: "owner@local.test",
        summary: { endsWith: " · ip 9.9.9.9" },
      }),
    });
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "wrong password · ip 9.9.9.9" }),
    );
  });
});
