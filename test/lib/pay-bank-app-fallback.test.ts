import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import ne from "@/lib/i18n/messages/ne.json";

/**
 * Guards HIVE-63.
 *
 * Tapping a bank runs `window.location.href = "<scheme>://…"`. A custom scheme
 * with no installed handler is a trapdoor: the browser reports neither success
 * nor failure, so there is no honest way to detect a missing app. The fix is
 * therefore not detection — it is making the bad case recoverable by revealing
 * the QR on tap, because on mobile the QR is collapsed behind a toggle exactly
 * while the bank list is showing.
 *
 * These assertions pin that behaviour. Each was checked against the pre-fix
 * source and fails there, so none of them is a test that cannot fail.
 */

const PAY_PAGE = "app/checkout/pay/[orderNumber]/page.tsx";
const source = readFileSync(path.join(process.cwd(), PAY_PAGE), "utf8");

const openBankAppBody = (() => {
  const start = source.indexOf("const openBankApp");
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("\n  };", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
})();

describe("bank-app deep link has a floor under it", () => {
  it("reveals the QR on tap, inside openBankApp itself", () => {
    // Not merely present somewhere in the file — it has to be on the tap path.
    expect(openBankAppBody).toContain("setShowQrOnMobile(true)");
  });

  it("still attempts the deep link", () => {
    // The fallback must not have quietly replaced the primary path.
    expect(openBankAppBody).toContain("window.location.href");
    expect(openBankAppBody).toContain("intentScheme");
  });

  it("renders the neutral prompt under the bank list", () => {
    expect(source).toContain("t.payment.didNotOpen");
  });

  it("does not reintroduce a detection heuristic", () => {
    // A timeout/visibility guess is wrong in both directions: a slow phone
    // shows "unavailable" while the payment IS opening, and iOS's own error
    // alert blurs the page so a missing app looks like success.
    expect(openBankAppBody).not.toMatch(/setTimeout|visibilitychange|blur/);
  });
});

describe("payment.appNotFound is gone, deliberately", () => {
  const payment = (c: { payment: Record<string, string> }) => c.payment;

  it("is absent from both catalogues", () => {
    // A dead string announcing "app not found" implies this page detects that
    // condition. It does not, and the next reader would conclude otherwise.
    expect(payment(en)).not.toHaveProperty("appNotFound");
    expect(payment(ne)).not.toHaveProperty("appNotFound");
  });

  it("is replaced by a prompt rather than a verdict, in both languages", () => {
    expect(payment(en).didNotOpen).toBeTruthy();
    expect(payment(ne).didNotOpen).toBeTruthy();
    // The Nepali must actually be Nepali, not an untranslated English copy.
    expect(payment(ne).didNotOpen).not.toBe(payment(en).didNotOpen);
    expect(payment(ne).didNotOpen).toMatch(/[ऀ-ॿ]/);
  });
});
