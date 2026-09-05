import { afterEach, describe, expect, it, vi } from "vitest";

const requiredEnv = {
  DATABASE_URL: "postgres://shaman:shaman@localhost:5433/shaman",
  SESSION_PASSWORD: "x".repeat(32),
  S3_PUBLIC_BASE: "https://example.invalid/uploads",
};

async function loadWith(overrides: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...requiredEnv, ...overrides })) {
    vi.stubEnv(key, value);
  }
  const { loadEnv } = await import("@/lib/env");
  return loadEnv();
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("optional environment variables", () => {
  it("treats an empty SMTP_PORT as absent and applies 587", async () => {
    const env = await loadWith({ SMTP_PORT: "" });
    expect(env.SMTP_PORT).toBe(587);
  });

  it("treats an empty SEED_STOCK as absent and applies false", async () => {
    const env = await loadWith({ SEED_STOCK: "" });
    expect(env.SEED_STOCK).toBe(false);
  });

  it("still parses explicit SMTP_PORT and SEED_STOCK values", async () => {
    const env = await loadWith({ SMTP_PORT: "2525", SEED_STOCK: "1" });
    expect(env.SMTP_PORT).toBe(2525);
    expect(env.SEED_STOCK).toBe(true);
  });

  it("applies string defaults after normalizing an empty optional", async () => {
    const env = await loadWith({ SMTP_FROM_NAME: "" });
    expect(env.SMTP_FROM_NAME).toBe("Shaman Kathmandu");
  });

  it("does not make an empty required variable optional", async () => {
    await expect(loadWith({ DATABASE_URL: "" })).rejects.toThrow(
      "Environment validation failed",
    );
  });
});
