export const dynamic = "force-dynamic";

// Admin order detail + status updates. PATCH delegates to
// lib/orders.updateOrderStatus — the same transition rules, timeline event,
// stock restore and customer email the MCP order tool uses.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { logAction } from "@/lib/audit";
import { ORDER_STATUSES, updateOrderStatus } from "@/lib/orders";
import { orderToDto } from "@/lib/orders/dto";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, email: true, name: true, phone: true } },
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      paymentTransactions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  // The admin detail page consumes the customer-facing DTO shape
  // (order.delivery.*, order.payment.*) plus admin-only extras.
  return NextResponse.json({
    message: "ok",
    order: {
      ...orderToDto(order),
      id: order.id,
      customer: order.customer,
      paymentTransactions: order.paymentTransactions.map((t) => ({
        id: t.id,
        provider: t.provider,
        referenceLabel: t.referenceLabel,
        prn: t.prn,
        amount: t.amount,
        status: t.status,
        verified: t.verified,
        fonepayTraceId: t.fonepayTraceId,
        errorMessage: t.errorMessage,
        createdAt: t.createdAt.toISOString(),
      })),
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
  const g = await requireRole("staff");
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
