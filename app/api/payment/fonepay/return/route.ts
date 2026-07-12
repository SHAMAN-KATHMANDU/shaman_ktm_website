export const dynamic = "force-dynamic";

// Fonepay redirects the customer's browser here after a payment attempt
// (the RU param of the signed request). This is a GET landing, not a JSON
// webhook: verify the signed result, settle the attempt, then redirect the
// human to their order page. Replays are harmless — settlement is idempotent
// on the unique prn. No session guard: the params are authenticated by the
// HMAC signature, and Fonepay may return the user in a fresh browser context.

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifyReturnParams, type FonepayReturnParams } from "@/lib/payment/fonepay";
import { getAttempt, settlePayment, failPayment } from "@/lib/payment/service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const prn = params.PRN ?? "";
  // Behind nginx the request origin is the internal host — prefer the
  // configured public origin for the browser-facing redirect.
  const base = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;
  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, base), { status: 303 });

  const attempt = prn ? await getAttempt(prn) : null;
  if (!attempt) {
    console.error("[fonepay-return] unknown PRN", { prn });
    return redirect("/account/dashboard?payment=unknown");
  }
  const orderPath = `/account/orders/${attempt.order.number}`;

  const result = verifyReturnParams(params as FonepayReturnParams, {
    amountNpr: attempt.amountNpr,
  });

  if (!result.signatureValid) {
    // Forged or corrupted params: never touch the attempt row off an
    // unauthenticated signal. The customer still lands on their order page,
    // which shows the true (unpaid) state.
    console.error("[fonepay-return] signature verification failed", {
      prn,
      error: result.error,
    });
    return redirect(`${orderPath}?payment=error`);
  }

  try {
    if (result.ok) {
      await settlePayment(prn, params);
      return redirect(`${orderPath}?payment=success`);
    }
    await failPayment(prn, result.error ?? "Payment did not complete", params);
    return redirect(`${orderPath}?payment=failed`);
  } catch (err) {
    console.error("[fonepay-return] settlement error", {
      prn,
      error: err instanceof Error ? err.message : String(err),
    });
    return redirect(`${orderPath}?payment=error`);
  }
}
