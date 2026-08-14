export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { recordDeliveryEvent, listDeliveryLog } from "@/lib/fulfilment";
import { DELIVERY_EVENTS } from "@/lib/fulfilment/constants";
import { findActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// One parcel's delivery log. Staff+ may read and append; nothing here can edit
// or remove an event, because a parcel's history is what it is.

const BodySchema = z.object({
  event: z.enum(DELIVERY_EVENTS),
  courierId: z.string().min(1).nullable().optional(),
  trackingRef: z.string().trim().max(120).nullable().optional(),
  codCollected: z.number().int().nonnegative().nullable().optional(),
  landmark: z.string().trim().max(200).nullable().optional(),
  recipientPhone: z.string().trim().max(30).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const log = await listDeliveryLog({ orderId: id, limit: 500 });
  return NextResponse.json({ message: "ok", ...log });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  // Attribution is best-effort here, unlike CRM/sales entry: an owner without a
  // linked Staff row should still be able to log that a parcel went out, and
  // the actor is recorded in AdminLog either way.
  const staff = await findActingStaff(g.session.userId);

  try {
    const { event, statusWarning } = await recordDeliveryEvent({
      orderId: id,
      event: d.event,
      staffId: staff?.id ?? null,
      courierId: d.courierId ?? null,
      trackingRef: d.trackingRef ?? null,
      codCollected: d.codCollected ?? null,
      landmark: d.landmark ?? null,
      recipientPhone: d.recipientPhone ?? null,
      note: d.note ?? null,
      actor: g.session.email,
    });

    logAction({
      actor: g.session.email,
      action: "create",
      entity: "DeliveryEvent",
      entityId: event.id,
      summary: `Delivery log: ${d.event} on order ${id}`,
    });

    // statusWarning is non-null when the event was recorded but the
    // customer-facing status could not follow it — the log is right and the
    // operator needs to know which half lagged.
    return NextResponse.json(
      { message: "ok", event, statusWarning },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
