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

  // The invariant, stated as a property: NOTHING the gateway says can make an
  // unverified attempt read as success. The three assertions below attack that
  // from different directions on purpose - a loop that calls
  // attemptBadgeLabel(false) three times only ever proves one fact once.
  it("renders the same non-success label whatever the gateway claims", () => {
    // Passing the status anyway, through a widened signature, is the point:
    // if someone later adds a `status` parameter and returns the raw value
    // when unverified, THIS is the call that starts failing.
    const widened = attemptBadgeLabel as (v: boolean, status?: string) => string;
    for (const status of GATEWAY_STATUSES) {
      expect(widened(false, status)).toBe("not verified");
      expect(widened(false, status)).not.toMatch(/success|paid|complete/i);
    }
  });

  it("takes exactly one parameter, so gateway status cannot leak into the label", () => {
    // Structural guard. The strongest form of the guarantee is that the
    // function cannot see the status at all; widening the signature is the
    // regression path, so make widening it fail loudly here rather than
    // silently pass because every existing caller omits the new argument.
    expect(attemptBadgeLabel.length).toBe(1);
  });

  it("never pairs a success tone with a non-success label, over the full matrix", () => {
    // Asserted through the same pair the page renders: badge label + tone.
    for (const verified of [true, false]) {
      for (const status of GATEWAY_STATUSES) {
        const label = attemptBadgeLabel(verified);
        const tone = attemptBadgeTone(verified, status);
        if (!verified) {
          expect(label).toBe("not verified");
          expect(tone).not.toBe("success");
        } else {
          expect(label).toBe("verified");
          expect(tone).toBe("success");
        }
      }
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
