export const dynamic = "force-dynamic";

// NCM webhook: order status updates from their carrier network.
// Requires ?secret= query param to match env.NCM_WEBHOOK_SECRET (closed by
// default when secret is empty). Permissively parses unknown payload shapes,
// finds shipment by ncmOrderId, ignores unknown ids (returns 200 so NCM doesn't
// retry), and appends to webhookLog.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

function normalizeStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  // Webhook closed by default (no secret configured)
  if (!env.NCM_WEBHOOK_SECRET) {
    return NextResponse.json(
      { message: "Webhook disabled" },
      { status: 403 },
    );
  }

  // Verify secret
  if (!secret || secret !== env.NCM_WEBHOOK_SECRET) {
    return NextResponse.json(
      { message: "Invalid secret" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  // Official payload (docs): { event: "order.status.changed", order_id,
  // status, timestamp, test? }. Also accept legacy `orderid` just in case.
  const PayloadSchema = z
    .object({
      order_id: z.union([z.string(), z.number()]).optional(),
      orderid: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
      test: z.boolean().optional(),
    })
    .passthrough();

  const parsed = PayloadSchema.safeParse(payload);
  const ncmOrderId = parsed.success
    ? String(parsed.data.order_id ?? parsed.data.orderid ?? "").trim()
    : "";
  const status = parsed.success ? (parsed.data.status || "").trim() : "";

  // NCM's webhook-test endpoint sends { test: true } with a fake order id —
  // acknowledge without touching data so the vendor-portal test passes.
  if (parsed.success && parsed.data.test === true) {
    return NextResponse.json({ status: "ok", test: true });
  }

  // Find shipment by ncmOrderId
  if (!ncmOrderId) {
    return NextResponse.json({ status: "ignored" });
  }

  const shipment = await prisma.shipment.findUnique({
    where: { ncmOrderId },
  });

  if (!shipment) {
    // Unknown order — return 200 so NCM doesn't retry
    return NextResponse.json({ status: "ignored" });
  }

  // Append to webhookLog and update status if provided
  const webhookEntry: Record<string, unknown> = {
    receivedAt: new Date().toISOString(),
  };
  if (parsed.success) {
    Object.assign(webhookEntry, payload);
  }

  const currentLog = Array.isArray(shipment.webhookLog)
    ? (shipment.webhookLog as unknown[])
    : [];

  const updatedWebhookLog = [...currentLog, webhookEntry];

  const newStatus = status ? normalizeStatus(status) : shipment.status;

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: newStatus,
      webhookLog: updatedWebhookLog as never,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ status: "ok" });
}
