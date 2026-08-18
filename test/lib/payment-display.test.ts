// The admin badge invariant: an unverified attempt is never described with a
// success-sounding word.
//
// This matters because of a real interaction between two correct behaviours.
// Fonepay's status vocabulary is "success" | "pending" | "failed"
// (lib/payment/fonepay-intent.ts), and on an AMOUNT MISMATCH the gateway
// reports "success" while our settlement route correctly returns 409 and
// refuses to settle - so `verified` stays false. Rendering the gateway's own
// word at that moment would print "success" beside an order that was never
// paid, undoing the server-side guarantee in the one case where money
// actually went missing.

import { describe, expect, it } from "vitest";
import {
  attemptBadgeLabel,
  attemptBadgeTone,
  paymentMethodLabel,
} from "@/lib/orders/payment-display";

const GATEWAY_STATUSES = ["success", "pending", "failed"] as const;

describe("attempt badge", () => {
  it("says verified only when the server verified it", () => {
    expect(attemptBadgeLabel(true)).toBe("verified");
    expect(attemptBadgeLabel(false)).toBe("not verified");
  });

  it("never renders a success-sounding word for an unverified attempt", () => {
    // The amount-mismatch case is the one this exists for: gateway "success",
    // verified false.
    for (const status of GATEWAY_STATUSES) {
      const label = attemptBadgeLabel(false);
      expect(label).toBe("not verified");
      expect(label).not.toMatch(/success/i);
      expect(attemptBadgeTone(false, status)).not.toBe("success");
    }
  });

  it("only lets a verified attempt look green", () => {
    expect(attemptBadgeTone(true, "success")).toBe("success");
    expect(attemptBadgeTone(false, "success")).toBe("neutral");
    expect(attemptBadgeTone(false, "failed")).toBe("danger");
  });
});

describe("payment method label", () => {
  it("gives one vocabulary to every surface", () => {
    expect(paymentMethodLabel("cod")).toBe("Cash on delivery");
    expect(paymentMethodLabel("fonepay")).toBe("Fonepay (QR)");
  });

  it("falls back to the raw value for an unknown method", () => {
    expect(paymentMethodLabel("crypto")).toBe("crypto");
  });
});
