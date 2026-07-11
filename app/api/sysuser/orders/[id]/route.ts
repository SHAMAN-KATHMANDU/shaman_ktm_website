export const dynamic = "force-dynamic";

// Admin order detail + status updates. PATCH delegates to
// lib/orders.updateOrderStatus — the same transition rules, timeline event,
// stock restore and customer email the MCP order tool uses.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminGuard, requireRole } from "@/lib/auth/guard";
import { logAction } from "@/lib/audit";
import { ORDER_STATUSES, updateOrderStatus } from "@/lib/orders";
import { orderToDto, paymentAttemptToDto, shipmentToDto } from "@/lib/orders/dto";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, email: true, name: true, phone: true } },
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      paymentTransactions: { orderBy: { createdAt: "desc" } },
      shipment: true,
    },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  // The detail page consumes the customer-facing DTO shape (delivery/payment
  // nested objects), plus admin-only extras alongside it.
  return NextResponse.json({
    message: "ok",
    order: {
      ...orderToDto(order),
      id: order.id,
      customer: order.customer,
      paymentAttempts: order.paymentTransactions.map(paymentAttemptToDto),
      shipment: order.shipment ? shipmentToDto(order.shipment) : null,
    },
  });
}

const PatchBody = z.object({
  status: z.enum(ORDER_STATUSES),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await updateOrderStatus(id, parsed.data.status, {
      notes: parsed.data.notes,
      actor: g.session.email,
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "Order",
      entityId: order.id,
      summary: `${order.number} → ${parsed.data.status}`,
    });
    return NextResponse.json({ message: "ok", order });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
