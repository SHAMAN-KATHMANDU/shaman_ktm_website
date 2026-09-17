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

const { sendEmail } = await import("@/lib/email");
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
  it("logs the provider messageId and response after a successful send", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc123@example.com>", response: "250 2.0.0 OK" });

    await expect(sendEmail(message)).resolves.toBe("sent");

    expect(log).toHaveBeenCalledWith("[email] sent", {
      to: message.to,
      subject: message.subject,
      messageId: "<abc123@example.com>",
      response: "250 2.0.0 OK",
    });
  });

  it("does not emit a success line when the provider fails", async () => {
    sendMail.mockRejectedValue(new Error("connection refused"));

    await expect(sendEmail(message)).resolves.toBe("failed");

    expect(log.mock.calls.some((call) => call[0] === "[email] sent")).toBe(false);
  });

  it("does not emit a success line when SMTP is unconfigured", async () => {
    envMock.SMTP_HOST = "";

    await expect(sendEmail(message)).resolves.toBe("dropped_no_smtp");

    expect(log.mock.calls.some((call) => call[0] === "[email] sent")).toBe(false);
  });
});
