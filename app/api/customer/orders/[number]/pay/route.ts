export const dynamic = "force-dynamic";

// POST: restart an unfinished Fonepay payment for an existing order (the
// customer closed/abandoned the gateway page). Mints a fresh prn — Fonepay
// rejects reused reference numbers — and returns a new signed gateway URL.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";
import { beginFonepayAttempt } from "@/lib/payment/service";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ number: string }> },
) {
  const g = await customerGuard();
  if (!g.ok) return g.response;
  const { number } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { number, customerId: g.session.customerId },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  if (order.paymentMethod !== "fonepay") {
    return NextResponse.json(
      { message: "This order is not payable online" },
      { status: 400 },
    );
  }
  if (order.paymentStatus === "completed") {
    return NextResponse.json(
      { message: "This order is already paid" },
      { status: 400 },
    );
  }
  if (order.status === "cancelled") {
    return NextResponse.json(
      { message: "This order was cancelled" },
      { status: 400 },
    );
  }

  try {
    const { paymentUrl } = await beginFonepayAttempt(
      order,
      new URL(req.url).origin,
    );
    return NextResponse.json({ message: "ok", paymentUrl });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    console.error("[retry-pay] fonepay attempt failed", {
      order: order.number,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { message: "Could not start the payment — please try again" },
      { status: 502 },
    );
  }
}
