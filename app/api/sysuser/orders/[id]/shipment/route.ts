export const dynamic = "force-dynamic";

// Admin: POST to book NCM delivery for an order. Only allowed on confirmed
// orders with no existing shipment (ncmOrderId). COD charge = total unless
// payment is already completed.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/auth/guard";
import { logAction } from "@/lib/audit";
import { shipmentToDto } from "@/lib/orders/dto";
import { getNcmClient } from "@/lib/ncm/client";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

const PostBody = z.object({
  destBranch: z.string().trim().min(1),
  deliveryType: z
    .enum(["Door2Door", "Branch2Door", "Door2Branch", "Branch2Branch"])
    .default("Door2Door"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true, shipment: true },
    });
    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 },
      );
    }

    if (order.shipment?.ncmOrderId) {
      return NextResponse.json(
        { message: "Shipment with NCM order ID already exists" },
        { status: 400 },
      );
    }

    const client = getNcmClient();

    // COD charge: total unless already paid online
    const codCharge =
      order.paymentStatus === "completed" ? 0 : order.total;

    const sourceBranch = env.NCM_SOURCE_BRANCH || "TINKUNE";

    // Carrier fee quote is informational — booking proceeds even if the
    // rate endpoint is down.
    const rateTypeMap: Record<string, "Pickup/Collect" | "Send" | "D2B" | "B2B"> = {
      Door2Door: "Pickup/Collect",
      Branch2Door: "Send",
      Door2Branch: "D2B",
      Branch2Branch: "B2B",
    };
    const deliveryChargeNpr = await client
      .getShippingRate({
        from: sourceBranch,
        to: parsed.data.destBranch,
        type: rateTypeMap[parsed.data.deliveryType],
      })
      .then((r) => Math.round(r))
      .catch(() => null);

    // Create order on NCM. Recipient details come from the order's delivery
    // snapshot, not the account profile.
    const ncmOrder = await client.createNcmOrder({
      name: order.deliveryName,
      phone: order.deliveryPhone,
      codCharge,
      address: order.deliveryAddress,
      sourceBranch,
      destBranch: parsed.data.destBranch,
      deliveryType: parsed.data.deliveryType,
      orderIdentifier: order.number,
      package: `Shaman Kathmandu order ${order.number}`,
    });

    // Upsert shipment row (create or update)
    const shipment = await prisma.shipment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        ncmOrderId: ncmOrder.ncmOrderId,
        trackingNumber: ncmOrder.trackingNumber,
        carrier: "ncm",
        sourceBranch,
        destBranch: parsed.data.destBranch,
        deliveryType: parsed.data.deliveryType,
        deliveryChargeNpr,
        status: "booked",
        webhookLog: [],
      },
      update: {
        ncmOrderId: ncmOrder.ncmOrderId,
        trackingNumber: ncmOrder.trackingNumber,
        destBranch: parsed.data.destBranch,
        deliveryType: parsed.data.deliveryType,
        deliveryChargeNpr,
        status: "booked",
        updatedAt: new Date(),
      },
    });

    logAction({
      actor: g.session.email,
      action: "create",
      entity: "Shipment",
      entityId: shipment.id,
      summary: `NCM order ${ncmOrder.ncmOrderId} for ${order.number}`,
    });

    return NextResponse.json({
      message: "ok",
      shipment: shipmentToDto(shipment),
    });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    console.error("Shipment creation error:", err);
    throw err;
  }
}
