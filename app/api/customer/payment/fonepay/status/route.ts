export const dynamic = "force-dynamic";

// POST: verify a Fonepay payment attempt against Fonepay's status API and, on
// confirmed success, settle the order. This is the ONLY code path that marks
// a fonepay order paid — the browser WebSocket and polling merely trigger it.
//
// Idempotent: safe to call any number of times (WS message + 15s poll +
// manual button all race here). The order flips to paid at most once, and the
// server-side Meta Purchase fires only on the attempt that performed the
// flip (guarded by the verified-row update count inside the transaction).

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";
import { logCustomerAction } from "@/lib/audit";
import { sendPurchaseCapi } from "@/lib/meta-capi";
import {
  getPaymentStatus,
  isFonepayConfigured,
} from "@/lib/payment/fonepay-intent";
import type { Prisma } from "@prisma/client";

const Body = z.object({
  orderNumber: z.string().trim().min(1).max(20),
  referenceLabel: z.string().trim().regex(/^[A-Za-z0-9]{1,30}$/),
});

export async function POST(req: Request) {
  const g = await customerGuard();
  if (!g.ok) return g.response;

  if (!isFonepayConfigured()) {
    return NextResponse.json(
      { message: "Fonepay payment is not available" },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      number: parsed.data.orderNumber,
      customerId: g.session.customerId,
    },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  const txn = await prisma.paymentTransaction.findFirst({
    where: { orderId: order.id, referenceLabel: parsed.data.referenceLabel },
  });
  if (!txn) {
    return NextResponse.json(
      { message: "Payment attempt not found" },
      { status: 404 },
    );
  }

  // Already settled (this or an earlier concurrent call): report success
  // without asking Fonepay again.
  if (order.paymentStatus === "completed") {
    return NextResponse.json({ message: "ok", paymentStatus: "success", paid: true });
  }

  let status;
  try {
    status = await getPaymentStatus(txn.referenceLabel);
  } catch (err) {
    console.error(
      `[fonepay] status check failed for ${order.number}/${txn.referenceLabel}:`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { message: "Could not verify the payment. Please try again." },
      { status: 502 },
    );
  }

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
    return NextResponse.json({
      message: "ok",
      paymentStatus: status.paymentStatus,
      paid: false,
    });
  }

  // Fonepay says success — the paid amount must match the order total before
  // we settle (whole NPR rupees; Fonepay reports "4500.00"-style strings).
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
    return NextResponse.json(
      { message: "Payment amount mismatch — contact support", paymentStatus: "failed", paid: false },
      { status: 409 },
    );
  }

  // Settle. updateMany's verified:false filter makes the flip happen exactly
  // once across concurrent calls; only the winner fires the Purchase event.
  const settled = await prisma.$transaction(async (tx) => {
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
    if (flip.count === 0) return false;
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "completed" },
    });
    return true;
  });

  if (settled) {
    logCustomerAction({
      actor: g.session.email,
      action: "payment_completed",
      entity: "Order",
      entityId: order.id,
      summary: `${order.number} — NPR ${order.total} via Fonepay (trace ${status.fonepayTraceId ?? "n/a"})`,
    });
    // Server-side Meta Purchase. For fonepay orders this intentionally fires
    // at settlement, not at order creation (see app/api/customer/orders).
    // event_id = order number still pairs with the browser pixel on the pay
    // page for deduplication.
    void sendPurchaseCapi({
      order,
      email: g.session.email,
      phone: order.deliveryPhone,
      headers: req.headers,
    });
  }

  return NextResponse.json({ message: "ok", paymentStatus: "success", paid: true });
}
