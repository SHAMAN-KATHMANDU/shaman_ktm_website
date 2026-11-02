import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: 587,
  SMTP_USER: "mailer@example.com",
  SMTP_PASS: "secret",
  SMTP_FROM_EMAIL: "sender@example.com",
  SMTP_FROM_NAME: "Shaman Kathmandu",
  NODE_ENV: "test",
};

const sendMail = vi.fn();
vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const { maskEmail, sendEmail } = await import("@/lib/email");
const error = vi.spyOn(console, "error").mockImplementation(() => {});
const log = vi.spyOn(console, "log").mockImplementation(() => {});

const message = {
  to: "buyer@example.com",
  subject: "Reset your password",
  html: "<p>x</p>",
};

beforeEach(() => {
  sendMail.mockReset();
  error.mockClear();
  log.mockClear();
  envMock.SMTP_HOST = "smtp.example.com";
});

describe("successful email observability", () => {
  it("masks individual and comma-separated addresses without echoing invalid values", () => {
    expect(maskEmail("rpandox@gmail.com")).toBe("r***@gmail.com");
    expect(maskEmail("invalid")).toBe("***");
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("@gmail.com")).toBe("***@gmail.com");
    expect(maskEmail("a@example.com, b@example.org")).toBe("a***@example.com, b***@example.org");
  });

  it("logs the provider messageId and response after a successful send", async () => {
    const address = "rpandox@gmail.com";
    sendMail.mockResolvedValue({ messageId: "<abc123@example.com>", response: "250 2.0.0 OK" });

    await expect(sendEmail({ ...message, to: address })).resolves.toBe("sent");

    expect(log).toHaveBeenCalledWith("[email] sent", {
      to: "r***@gmail.com",
      subject: message.subject,
      messageId: "<abc123@example.com>",
      response: "250 2.0.0 OK",
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: address }));
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain(address);
  });

  it("does not emit a success line when the provider fails", async () => {
    const address = "rpandox@gmail.com";
    sendMail.mockRejectedValue(new Error("connection refused"));

    await expect(sendEmail({ ...message, to: address })).resolves.toBe("failed");

    expect(log.mock.calls.some((call) => call[0] === "[email] sent")).toBe(false);
    expect(error).toHaveBeenCalledWith("[email] send failed", {
      to: "r***@gmail.com",
      subject: message.subject,
      error: "connection refused",
    });
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain(address);
  });

  it("does not emit a success line when SMTP is unconfigured", async () => {
    const address = "rpandox@gmail.com";
    envMock.SMTP_HOST = "";
    envMock.NODE_ENV = "production";

    await expect(sendEmail({ ...message, to: address })).resolves.toBe("dropped_no_smtp");

    expect(log.mock.calls.some((call) => call[0] === "[email] sent")).toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("[email] MISCONFIGURED"), {
      to: "r***@gmail.com",
      subject: message.subject,
    });
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain(address);
  });
});
