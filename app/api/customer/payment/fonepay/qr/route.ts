export const dynamic = "force-dynamic";

// POST: mint (or reuse) a Fonepay Dynamic Intent QR for one of the signed-in
// customer's own unpaid fonepay orders.
//
// A plain page refresh must NOT burn a new referenceLabel (they are unique
// per transaction on Fonepay's side), so the latest still-pending attempt is
// returned as-is unless the client asks for a fresh one with force:true
// (the "Try Again" button after a failed/expired attempt).

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { customerGuard } from "@/lib/auth/customer-guard";
import {
  FonepayError,
  generateIntentQr,
  isFonepayConfigured,
  makeReferenceLabel,
} from "@/lib/payment/fonepay-intent";

const Body = z.object({
  orderNumber: z.string().trim().min(1).max(20),
  force: z.boolean().optional().default(false),
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
  if (order.paymentMethod !== "fonepay") {
    return NextResponse.json(
      { message: "Order is not a Fonepay order" },
      { status: 400 },
    );
  }
  if (order.paymentStatus === "completed") {
    return NextResponse.json(
      { message: "Order is already paid", paid: true },
      { status: 409 },
    );
  }
  if (order.status === "cancelled") {
    return NextResponse.json(
      { message: "Order is cancelled" },
      { status: 409 },
    );
  }

  const attempts = await prisma.paymentTransaction.findMany({
    where: { orderId: order.id, provider: "fonepay" },
    orderBy: { createdAt: "desc" },
  });

  const reusable = attempts.find(
    (t) => t.status === "pending" && t.qrString && t.websocketId,
  );
  if (reusable && !parsed.data.force) {
    return NextResponse.json({
      message: "ok",
      referenceLabel: reusable.referenceLabel,
      qrString: reusable.qrString,
      websocketId: reusable.websocketId,
      amount: reusable.amount,
      orderNumber: order.number,
      order: orderSummary(order),
    });
  }

  const referenceLabel = makeReferenceLabel(order.number, attempts.length + 1);
  try {
    const qr = await generateIntentQr({
      amount: order.total,
      billId: order.number,
      referenceLabel,
    });
    const txn = await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: "fonepay",
        referenceLabel,
        prn: qr.prn,
        billId: order.number,
        terminalId: env.FONEPAY_TERMINAL_ID,
        amount: order.total,
        status: "pending",
        qrString: qr.qrString,
        websocketId: qr.websocketId,
      },
    });
    return NextResponse.json({
      message: "ok",
      referenceLabel: txn.referenceLabel,
      qrString: txn.qrString,
      websocketId: txn.websocketId,
      amount: txn.amount,
      orderNumber: order.number,
      order: orderSummary(order),
    });
  } catch (err) {
    console.error(
      `[fonepay] QR generation failed for ${order.number}:`,
      err instanceof Error ? err.message : err,
    );
    const status = err instanceof FonepayError && err.status === 409 ? 409 : 502;
    return NextResponse.json(
      { message: "Could not start the Fonepay payment. Please try again." },
      { status },
    );
  }
}

// Just enough order data for the pay page: totals for display and item
// snapshots for the browser Purchase pixel after settlement.
function orderSummary(order: {
  number: string;
  total: number;
  subtotal: number;
  items: {
    productSlug: string;
    variationId: string | null;
    quantity: number;
    priceAtOrder: number;
    productName: string;
  }[];
}) {
  return {
    number: order.number,
    total: order.total,
    subtotal: order.subtotal,
    items: order.items.map((i) => ({
      productSlug: i.productSlug,
      variationId: i.variationId,
      quantity: i.quantity,
      priceAtOrder: i.priceAtOrder,
      productName: i.productName,
    })),
  };
}
