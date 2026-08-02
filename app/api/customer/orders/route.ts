export const dynamic = "force-dynamic";

// POST: place a COD order (checkout). The client sends only product ids,
// variation ids and quantities — prices, names and availability are resolved
// from the database inside lib/orders.createOrder.
// GET: list the signed-in customer's orders, newest first.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";
import { logCustomerAction } from "@/lib/audit";
import { createOrder, DELIVERY_ZONES } from "@/lib/orders";
import { orderToDto } from "@/lib/orders/dto";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { sendPurchaseCapi } from "@/lib/meta-capi";

const Body = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variationId: z.string().min(1).optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  delivery: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(32),
    address: z.string().trim().min(5).max(500),
    zone: z.enum(DELIVERY_ZONES),
    notes: z.string().trim().max(500).optional(),
  }),
});

export async function POST(req: Request) {
  const g = await customerGuard();
  if (!g.ok) return g.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid order", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await createOrder(
      g.session.customerId,
      parsed.data.items,
      parsed.data.delivery,
    );
    logCustomerAction({
      actor: g.session.email,
      action: "order_placed",
      entity: "Order",
      entityId: order.id,
      summary: `${order.number} — NPR ${order.total}`,
    });
    // Server-side Meta Purchase (Conversions API). Same event_id as the
    // browser pixel's eventID (the order number) so Meta dedups the pair.
    // Never awaited into the response path — a Meta failure can't fail or
    // slow checkout (sendPurchaseCapi itself never throws).
    void sendPurchaseCapi({
      order,
      email: g.session.email,
      phone: parsed.data.delivery.phone,
      headers: req.headers,
    });
    return NextResponse.json({ message: "ok", order: orderToDto(order) });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}

const PAGE_SIZE_MAX = 50;

export async function GET(req: Request) {
  const g = await customerGuard();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const pageRaw = Number(searchParams.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : 1;
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, PAGE_SIZE_MAX)
      : 10;

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: g.session.customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where: { customerId: g.session.customerId } }),
  ]);

  return NextResponse.json({
    message: "ok",
    orders: rows.map(orderToDto),
    total,
    page,
    limit,
  });
}
