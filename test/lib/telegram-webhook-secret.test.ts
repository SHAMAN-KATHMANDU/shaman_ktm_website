// The webhook secret is compared in constant time; the accept/reject contract
// must stay exactly what it was with ===.

import { describe, expect, it, vi } from "vitest";

const SECRET = "s".repeat(40);
vi.hoisted(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = "s".repeat(40);
});
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/s3", () => ({ putObject: async () => "" }));

import { verifyWebhookSecret } from "@/lib/telegram/core";

const req = (secret?: string) =>
  new Request("http://localhost/api/telegram", {
    headers: secret === undefined ? {} : { "x-telegram-bot-api-secret-token": secret },
  });

describe("verifyWebhookSecret", () => {
  it("accepts the configured secret", () => {
    expect(verifyWebhookSecret(req(SECRET))).toBe(true);
  });

  it.each([undefined, "", "s".repeat(39), `${"s".repeat(39)}x`, "s".repeat(41)])(
    "rejects %s",
    (secret) => {
      expect(verifyWebhookSecret(req(secret))).toBe(false);
    },
  );
});
