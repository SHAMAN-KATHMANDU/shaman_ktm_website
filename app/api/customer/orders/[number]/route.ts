export const dynamic = "force-dynamic";

// Order detail for the signed-in customer, including the status timeline.
// Another customer's order number 404s (not 403) so numbers can't be probed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";
import { orderToDto } from "@/lib/orders/dto";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ number: string }> },
) {
  const g = await customerGuard();
  if (!g.ok) return g.response;
  const { number } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.customerId !== g.session.customerId) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "ok", order: orderToDto(order) });
}
