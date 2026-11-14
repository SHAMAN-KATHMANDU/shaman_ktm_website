export const dynamic = "force-dynamic";

// POST: verify a Fonepay payment attempt against Fonepay's status API and, on
// confirmed success, settle the order. The browser WebSocket and polling
// merely trigger it. The QR route and the unpaid-order sweep run the same
// verifyOrderPayments() check, so they can settle an order too.
//
// Idempotent: safe to call any number of times (WS message + 15s poll +
// manual button all race here). The order flips to paid at most once, and the
// server-side Meta Purchase fires only on the call that performed the flip.
// The checking itself lives in lib/payment/settle.ts (verifyOrderPayments).

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";
import { logCustomerAction } from "@/lib/audit";
import { sendPurchaseCapi } from "@/lib/meta-capi";
import { isFonepayConfigured } from "@/lib/payment/fonepay-intent";
import { verifyOrderPayments } from "@/lib/payment/settle";

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

  // Checks every unverified attempt of the order (an older QR may be the one
  // that was paid); attempts already decided cost no gateway call.
  const result = await verifyOrderPayments(order);

  if (result.settledNow) {
    logCustomerAction({
      actor: g.session.email,
      action: "payment_completed",
      entity: "Order",
      entityId: order.id,
      summary: `${order.number} — NPR ${order.total} via Fonepay (trace ${result.settledTraceId ?? "n/a"})`,
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

  if (result.paid) {
    return NextResponse.json({ message: "ok", paymentStatus: "success", paid: true });
  }
  if (result.refundOwed) {
    return NextResponse.json(
      {
        message:
          "This order was cancelled before your payment arrived. The payment is recorded and will be refunded — please contact support.",
        // "failed" stops the pay page polling an order that can never be paid.
        paymentStatus: "failed",
        paid: false,
      },
      { status: 409 },
    );
  }
  if (result.mismatch) {
    return NextResponse.json(
      { message: "Payment amount mismatch — contact support", paymentStatus: "failed", paid: false },
      { status: 409 },
    );
  }
  if (result.gatewayError) {
    return NextResponse.json(
      { message: "Could not verify the payment. Please try again." },
      { status: 502 },
    );
  }
  return NextResponse.json({
    message: "ok",
    paymentStatus: result.statuses[txn.referenceLabel] ?? txn.status,
    paid: false,
  });
}
