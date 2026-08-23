// A dropped email must be loud in production and quiet in development, and
// must never be fatal in either.
//
// lib/email.ts degrades to a console line when SMTP_HOST is empty. In dev that
// is the point — the app runs with zero setup. In production it means a
// customer who asked for a password reset was told to check their inbox, the
// reset link went to stdout, and nothing anywhere reported a problem. Verified
// on 2026-08-21: every SMTP_* variable is unset in the running production
// container, so this is the state the live site is in.
//
// The fire-and-forget contract is deliberate and is pinned here too: every
// caller does `void sendEmail(...)`, so a throw would become an unhandled
// rejection in a checkout. Loud, never fatal.

import { describe, expect, it, vi, beforeEach } from "vitest";

const envMock = { SMTP_HOST: "", SMTP_PORT: 587, SMTP_USER: "", SMTP_PASS: "", SMTP_FROM_EMAIL: "", SMTP_FROM_NAME: "Shaman Kathmandu", NODE_ENV: "development" };
vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: async () => ({}) }) },
}));

const { sendEmail, unconfiguredSeverity } = await import("@/lib/email");

// Spied once: vi.spyOn() on an already-spied method returns the SAME mock, so
// re-spying per test would accumulate calls across tests.
const error = vi.spyOn(console, "error").mockImplementation(() => {});
const log = vi.spyOn(console, "log").mockImplementation(() => {});

const message = { to: "buyer@example.com", subject: "Reset your password", html: "<p>x</p>" };

beforeEach(() => {
  error.mockClear();
  log.mockClear();
  envMock.SMTP_HOST = "";
  envMock.NODE_ENV = "development";
});

describe("unconfiguredSeverity", () => {
  it("is an error only in production", () => {
    expect(unconfiguredSeverity("production")).toBe("error");
    expect(unconfiguredSeverity("development")).toBe("info");
    expect(unconfiguredSeverity("test")).toBe("info");
    // An unset NODE_ENV must not be mistaken for production and start
    // shouting in a local shell.
    expect(unconfiguredSeverity(undefined)).toBe("info");
  });
});

describe("an email that cannot be sent", () => {
  it("is reported at ERROR in production, and says it was dropped", async () => {
    envMock.NODE_ENV = "production";
    await sendEmail(message);

    expect(error).toHaveBeenCalled();
    const line = String(error.mock.calls[0][0]);
    expect(line).toContain("MISCONFIGURED");
    expect(line).toContain("SMTP_HOST");
    // The three words that stop a reader assuming it will arrive later.
    expect(line).toContain("DROPPED");
    expect(line).toContain("not queued");
    expect(line).toContain("not retried");
    // The recipient and subject stay attached: an operator needs to know WHO
    // was not told, not merely that somebody wasn't.
    expect(error.mock.calls[0][1]).toMatchObject({
      to: "buyer@example.com",
      subject: "Reset your password",
    });
    // It must not ALSO appear as an ordinary dev line — that is the log a
    // reader currently skims past.
    expect(log).not.toHaveBeenCalled();
  });

  it("stays quiet and friendly outside production", async () => {
    envMock.NODE_ENV = "development";
    await sendEmail(message);

    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain("[email-dev]");
    expect(error).not.toHaveBeenCalled();
  });

  it("never becomes fatal — the promise resolves either way", async () => {
    // Every caller does `void sendEmail(...)`; a rejection here is an
    // unhandled rejection inside a checkout.
    envMock.NODE_ENV = "production";
    await expect(sendEmail(message)).resolves.toBeUndefined();
    envMock.NODE_ENV = "development";
    await expect(sendEmail(message)).resolves.toBeUndefined();
  });

  it("reports EVERY dropped message, not just the first", async () => {
    // The remediation text is printed once, but a drop that stops being
    // reported is the original defect coming back in a new costume.
    envMock.NODE_ENV = "production";
    await sendEmail({ ...message, to: "a@example.com" });
    await sendEmail({ ...message, to: "b@example.com" });
    await sendEmail({ ...message, to: "c@example.com" });

    const dropped = error.mock.calls.filter((c) => String(c[0]).includes("DROPPED"));
    expect(dropped).toHaveLength(3);
    expect(dropped.map((c) => (c[1] as { to: string }).to)).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
    ]);
  });

  it("says nothing when SMTP is configured", async () => {
    envMock.NODE_ENV = "production";
    envMock.SMTP_HOST = "smtp.example.com";
    await sendEmail(message);
    expect(error).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
