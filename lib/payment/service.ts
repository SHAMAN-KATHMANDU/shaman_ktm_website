// Payment-attempt bookkeeping shared by the checkout route, the retry-pay
// route and the gateway return handler. Mirrors lib/orders: one implementation
// so REST and any future MCP surface behave identically.
//
// Idempotency model: `prn` is unique per attempt (PaymentTransaction.prn has a
// unique index). Gateways may deliver the same return callback more than once;
// settlePayment/failPayment are safe to call repeatedly for the same prn.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { env } from "@/lib/env";
import { logCustomerAction } from "@/lib/audit";
import { buildRedirectUrl, mintPrn } from "@/lib/payment/fonepay";

/**
 * Mint a fresh Fonepay attempt for an order and return the gateway URL the
 * browser should be sent to. Used by checkout and by the retry-pay route.
 * `requestOrigin` is the fallback when NEXT_PUBLIC_SITE_URL is unset (dev).
 */
export async function beginFonepayAttempt(
  order: { id: string; number: string; total: number },
  requestOrigin: string,
): Promise<{ paymentUrl: string; prn: string }> {
  const origin =
    env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || requestOrigin;
  const prn = mintPrn(order.number);
  await recordAttempt({
    orderId: order.id,
    provider: "fonepay",
    prn,
    amountNpr: order.total,
  });
  const paymentUrl = buildRedirectUrl({
    amountNpr: order.total,
    prn,
    returnUrl: `${origin}/api/payment/fonepay/return`,
    remarks1: order.number,
  });
  return { paymentUrl, prn };
}

/**
 * Record a fresh gateway attempt for an order. Re-recording the same prn
 * returns the existing row (idempotent against double-submits).
 */
export async function recordAttempt(args: {
  orderId: string;
  provider: "fonepay";
  prn: string;
  amountNpr: number;
}) {
  try {
    return await prisma.paymentTransaction.create({
      data: {
        orderId: args.orderId,
        provider: args.provider,
        prn: args.prn,
        amountNpr: args.amountNpr,
      },
    });
  } catch (err) {
    // Unique violation on prn → attempt already recorded.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return prisma.paymentTransaction.findUniqueOrThrow({
        where: { prn: args.prn },
      });
    }
    throw err;
  }
}

export async function getAttempt(prn: string) {
  return prisma.paymentTransaction.findUnique({
    where: { prn },
    include: {
      order: {
        select: {
          id: true,
          number: true,
          total: true,
          paymentStatus: true,
          customer: { select: { email: true } },
        },
      },
    },
  });
}

/**
 * Mark an attempt (and its order) paid. Idempotent: replaying a return
 * callback for an already-completed prn is a no-op that still succeeds.
 */
export async function settlePayment(
  prn: string,
  rawReturn: Record<string, string>,
) {
  const tx = await getAttempt(prn);
  if (!tx) {
    throw new CmsError(`Unknown payment reference ${prn}`, { statusCode: 404 });
  }
  if (tx.status === "completed") return tx; // replayed callback

  const updated = await prisma.$transaction(async (t) => {
    const row = await t.paymentTransaction.update({
      where: { prn },
      data: {
        status: "completed",
        verified: true,
        rawReturn,
        errorMessage: null,
      },
    });
    await t.order.update({
      where: { id: tx.orderId },
      data: { paymentStatus: "completed" },
    });
    return row;
  });

  logCustomerAction({
    actor: tx.order.customer.email,
    action: "payment_completed",
    entity: "Order",
    entityId: tx.orderId,
    summary: `${tx.order.number} — ${tx.provider} NPR ${tx.amountNpr} (${prn})`,
  });

  return updated;
}

/**
 * Record a failed/abandoned attempt. Never touches the order row — the order
 * simply stays paymentStatus="pending" and can be retried with a new prn.
 * Completed attempts are left untouched (a late failure callback after a
 * success replay must not un-pay an order).
 */
export async function failPayment(
  prn: string,
  error: string,
  rawReturn?: Record<string, string>,
) {
  const tx = await getAttempt(prn);
  if (!tx || tx.status === "completed") return tx;

  const updated = await prisma.paymentTransaction.update({
    where: { prn },
    data: {
      status: "failed",
      errorMessage: error.slice(0, 500),
      ...(rawReturn ? { rawReturn } : {}),
    },
  });

  logCustomerAction({
    actor: tx.order.customer.email,
    action: "payment_failed",
    entity: "Order",
    entityId: tx.orderId,
    summary: `${tx.order.number} — ${tx.provider} (${prn}): ${error.slice(0, 120)}`,
  });

  return updated;
}
