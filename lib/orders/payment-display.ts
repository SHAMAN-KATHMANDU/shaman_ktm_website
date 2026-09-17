// Presentation helpers for payment data, shared by every admin surface so the
// same row cannot be described two different ways one click apart.
//
// Kept free of React and Prisma imports on purpose: these are pure functions,
// which is what lets the admin badge — otherwise unreachable UI logic in a
// client component — be covered by the normal vitest suite.

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  fonepay: "Fonepay (QR)",
  esewa: "eSewa",
  khalti: "Khalti",
  bank: "Bank transfer",
};

/** Human label for a payment method, falling back to the raw value. */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method] ?? method;
}

/**
 * Label for a payment ATTEMPT badge.
 *
 * The invariant: an attempt that our server has not verified must never be
 * described with a success-sounding word, because the gateway's own status is
 * "success" in exactly the case that matters most — an amount mismatch, where
 * Fonepay reports success, the settlement route refuses to settle (409), and
 * `verified` stays false. Printing the gateway's word there would tell staff
 * an unpaid order was paid.
 *
 * Only `verified` — set by the server after checking the amount — earns
 * "verified". Everything else reads "not verified"; the raw gateway status is
 * shown separately as secondary context, never as the verdict.
 */
export function attemptBadgeLabel(verified: boolean): "verified" | "not verified" {
  return verified ? "verified" : "not verified";
}

/** Badge tone for a payment attempt. Only a verified attempt may look green. */
export function attemptBadgeTone(
  verified: boolean,
  status: string,
): "success" | "danger" | "neutral" {
  if (verified) return "success";
  return status === "failed" ? "danger" : "neutral";
}
