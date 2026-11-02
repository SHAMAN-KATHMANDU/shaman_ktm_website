// A container that cannot send email must say so at boot, not at first loss.
//
// lib/email.ts reports every dropped message (test/lib/email-unconfigured.test.ts
// pins that). But a drop report only appears once something has already been
// lost — by then a customer has requested a password reset and been told to
// check an inbox that will stay empty. The startup line moves the discovery
// before the damage: `docker logs` shows the defect from the first line.
//
// Verified on 2026-08-21: every SMTP_* variable is unset in the running
// production container, so this warning describes the live state today.
//
// This exercises the REAL instrumentation.register() and the REAL env loader
// rather than mocks — the thing that failed here was wiring, and a test that
// mocks the wiring cannot see wiring break.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules(); // lib/env caches the parsed env at module scope.
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

/** Boot the real register() under a given environment; return the console.error spy. */
async function boot(vars: Record<string, string | undefined>) {
  const env = process.env as Record<string, string | undefined>;
  env.NEXT_RUNTIME = "nodejs";
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const { register } = await import("@/instrumentation");
  await register();
  return error;
}

const startupLines = (error: { mock: { calls: unknown[][] } }) =>
  error.mock.calls.filter((c) => String(c[0]).includes("[email] STARTUP"));

describe("boot-time SMTP warning", () => {
  it("shouts once at startup when production has no SMTP_HOST", async () => {
    const error = await boot({ NODE_ENV: "production", SMTP_HOST: "" });

    const lines = startupLines(error);
    expect(lines).toHaveLength(1);

    const line = String(lines[0][0]);
    expect(line).toContain("SMTP_HOST");
    // The words that stop a reader assuming the mail is merely delayed.
    expect(line).toContain("DROPPED");
    expect(line).toContain("not queued");
    expect(line).toContain("not retried");
    // An operator needs the fix, not just the diagnosis. This is the exact
    // trap that kept production broken: the values were in .env but never in
    // the service's environment: block, so nothing reached the container.
    expect(line).toContain("environment:");
    expect(line).toContain("check-env.sh");
  });

  // The controls below are the point of the test. A warning that fires
  // everywhere proves nothing: if this check were hard-coded to always shout,
  // the case above would still pass and only these would fail.

  it("stays silent when SMTP_HOST is configured", async () => {
    const error = await boot({
      NODE_ENV: "production",
      SMTP_HOST: "smtp.example.com",
    });
    expect(startupLines(error)).toHaveLength(0);
  });

  it("stays silent outside production, where a console mailer is the point", async () => {
    for (const NODE_ENV of ["development", "test"]) {
      vi.resetModules();
      const error = await boot({ NODE_ENV, SMTP_HOST: "" });
      expect(startupLines(error)).toHaveLength(0);
    }
  });

  it("does not run on the edge runtime, which loads a different bundle", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "production";
    env.SMTP_HOST = "";
    env.NEXT_RUNTIME = "edge";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { register } = await import("@/instrumentation");
    await register();
    expect(startupLines(error)).toHaveLength(0);
  });

  it("warns without becoming fatal — a mail misconfiguration must not kill the site", async () => {
    // Refusing to boot would trade dropped email for a dead storefront.
    const env = process.env as Record<string, string | undefined>;
    env.NEXT_RUNTIME = "nodejs";
    env.NODE_ENV = "production";
    env.SMTP_HOST = "";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { register } = await import("@/instrumentation");
    await expect(register()).resolves.toBeUndefined();
  });
});
