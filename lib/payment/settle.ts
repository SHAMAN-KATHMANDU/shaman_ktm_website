// Order payment settlement. markOrderPaid() is the one place an order becomes
// paid, whatever the method (Fonepay settle, COD cash collected in full).
// Deliberately free of lib/orders imports so lib/orders can call it.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaymentStatus } from "@/lib/payment/fonepay-intent";

type Db = Prisma.TransactionClient;

/** Order.paymentStatus once money was taken for an order that no longer stands. */
export const REFUND_OWED = "refund_owed";

/**
 * Flip an order to paid. Guarded so it happens at most once and never on a
 * cancelled order; returns whether this call made the flip.
 */
export async function markOrderPaid(tx: Db, orderId: string): Promise<boolean> {
  const won = await tx.order.updateMany({
    where: { id: orderId, paymentStatus: "pending", status: { not: "cancelled" } },
    data: { paymentStatus: "completed" },
  });
  return won.count > 0;
}

export interface VerifyResult {
  /** The order is paid (by this call or earlier). */
  paid: boolean;
  /** This call performed the flip — only it may fire Purchase/audit. */
  settledNow: boolean;
  /** Fonepay trace id of the attempt this call settled. */
  settledTraceId: string | null;
  /** A confirmed payment arrived that the order could not take. */
  refundOwed: boolean;
  /** Fonepay reported success for a different amount. */
  mismatch: boolean;
  /** At least one attempt could not be checked. */
  gatewayError: boolean;
  /** Gateway status per referenceLabel checked in this call. */
  statuses: Record<string, string>;
}

/**
 * Ask Fonepay about EVERY unverified pending attempt of an order, not only the
 * one the browser is showing: a customer can pay an older QR after a retry
 * minted a new one. The first confirmed success settles the order; any later
 * success is recorded on its attempt as refund owed (duplicate payment, or
 * paid after the order was cancelled) so staff can see it.
 */
export async function verifyOrderPayments(order: {
  id: string;
  number: string;
  total: number;
}): Promise<VerifyResult> {
  const result: VerifyResult = {
    paid: false,
    settledNow: false,
    settledTraceId: null,
    refundOwed: false,
    mismatch: false,
    gatewayError: false,
    statuses: {},
  };
  const attempts = await prisma.paymentTransaction.findMany({
    where: { orderId: order.id, provider: "fonepay", verified: false, status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  for (const txn of attempts) {
    let status;
    try {
      status = await getPaymentStatus(txn.referenceLabel);
    } catch (err) {
      console.error(
        `[fonepay] status check failed for ${order.number}/${txn.referenceLabel}:`,
        err instanceof Error ? err.message : err,
      );
      result.gatewayError = true;
      continue;
    }
    result.statuses[txn.referenceLabel] = status.paymentStatus;
    const rawPayload = status.raw as Prisma.InputJsonValue;

    if (status.paymentStatus !== "success") {
      await prisma.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          status: status.paymentStatus,
          fonepayTraceId: status.fonepayTraceId,
          rawStatusPayload: rawPayload,
          errorMessage:
            status.paymentStatus === "failed" ? status.paymentMessage || "failed" : null,
        },
      });
      continue;
    }

    // The paid amount must match the order total before we settle (whole NPR
    // rupees; Fonepay reports "4500.00"-style strings).
    if (status.totalTransactionAmount !== order.total) {
      console.error(
        `[fonepay] AMOUNT MISMATCH on ${order.number}/${txn.referenceLabel}: ` +
          `order total ${order.total}, Fonepay reports ${status.totalTransactionAmount}. ` +
          `NOT settling — investigate in the Fonepay merchant portal.`,
      );
      await prisma.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          fonepayTraceId: status.fonepayTraceId,
          rawStatusPayload: rawPayload,
          errorMessage: `Amount mismatch: expected ${order.total}, Fonepay reported ${status.totalTransactionAmount}`,
        },
      });
      result.mismatch = true;
      continue;
    }

    const outcome = await prisma.$transaction(async (tx) => {
      // verified:false makes the flip exactly-once across concurrent callers;
      // a caller that loses it verified nothing new.
      const flip = await tx.paymentTransaction.updateMany({
        where: { id: txn.id, verified: false },
        data: {
          status: "success",
          verified: true,
          fonepayTraceId: status.fonepayTraceId,
          rawStatusPayload: rawPayload,
          errorMessage: null,
        },
      });
      if (flip.count === 0) return "already" as const;
      if (await markOrderPaid(tx, order.id)) return "settled" as const;
      const current = await tx.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          refundOwed: true,
          errorMessage:
            current?.status === "cancelled"
              ? "Paid after the order was cancelled — refund owed"
              : "Duplicate payment: the order was already paid by another attempt — refund owed",
        },
      });
      return "refund" as const;
    });
    if (outcome === "settled") {
      result.settledNow = true;
      result.settledTraceId = status.fonepayTraceId;
    }
    if (outcome === "refund") result.refundOwed = true;
  }

  const fresh = await prisma.order.findUnique({
    where: { id: order.id },
    select: { paymentStatus: true },
  });
  result.paid = fresh?.paymentStatus === "completed";
  return result;
}
