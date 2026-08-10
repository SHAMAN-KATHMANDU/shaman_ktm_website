// The delivery log (spec: "delivery log" — one of the seven reporting needs).
//
// What this replaces: a parcel's journey currently lives in whoever remembers
// it. Here it is an append-only row per real-world event, dated in both
// calendars and attributed to a person, so "how many failed attempts did we
// have on inDrive last month" becomes a query.
//
// Two rules:
//   1. The log is append-only. A mistake is corrected by recording what
//      actually happened next, never by editing history.
//   2. There is ONE customer-facing status. Recording a dispatch moves
//      Order.status through the existing machine (which emails the customer),
//      so the delivery log and the customer's view cannot drift apart.

import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { adToBs } from "@/lib/dates";
import { updateOrderStatus } from "@/lib/orders";
import { STATUS_TRANSITIONS, type OrderStatus } from "@/lib/orders/constants";
import {
  DELIVERY_EVENTS,
  DELIVERY_EVENT_ORDER_STATUS,
  DELIVERY_EVENT_REQUIRES,
  type DeliveryEventName,
} from "./constants";

const MAX_PAGE_SIZE = 500;

export interface RecordDeliveryEventInput {
  orderId: string;
  event: DeliveryEventName;
  staffId?: string | null;
  courierId?: string | null;
  trackingRef?: string | null;
  /** Cash taken at the door on this event, NPR. */
  codCollected?: number | null;
  landmark?: string | null;
  recipientPhone?: string | null;
  note?: string | null;
  /** Who is recording it, for the customer-facing status event. */
  actor: string;
}

/**
 * Record one thing that happened to a parcel.
 *
 * The order's summary columns (dispatchedAt, deliveredAt, courier, who packed
 * it, what was collected) are materialized from this log in the same
 * transaction — they exist so the admin list can filter without walking every
 * event, and they are never written from anywhere else.
 */
export async function recordDeliveryEvent(input: RecordDeliveryEventInput) {
  if (!DELIVERY_EVENTS.includes(input.event)) {
    throw new CmsError(`Unknown delivery event "${input.event}"`, {
      statusCode: 400,
      availableOptions: [...DELIVERY_EVENTS],
      referenceKind: "event",
    });
  }
  if (input.codCollected != null && input.codCollected < 0) {
    throw new CmsError("Cash collected cannot be negative", {
      statusCode: 400,
      referenceKind: "codCollected",
    });
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      number: true,
      status: true,
      deliveryEvents: { select: { event: true } },
    },
  });
  if (!order) throw new CmsError("Order not found", { statusCode: 404 });

  if (order.status === "cancelled") {
    throw new CmsError(
      `Order ${order.number} is cancelled — nothing more happens to it`,
      { statusCode: 400 },
    );
  }

  // Does the log support this event yet?
  const seen = new Set(order.deliveryEvents.map((e) => e.event));
  const missing = DELIVERY_EVENT_REQUIRES[input.event].filter(
    (r) => !seen.has(r),
  );
  if (missing.length > 0) {
    throw new CmsError(
      `Cannot record "${input.event}" for ${order.number} — nothing says it was ${missing.join(" or ")} yet`,
      {
        statusCode: 400,
        referenceKind: "event",
        availableOptions: [...missing],
      },
    );
  }

  // If this event moves the customer's view, check that move is legal BEFORE
  // writing anything — a dispatch recorded against an unconfirmed order would
  // otherwise leave the log ahead of the status with no way to reconcile.
  const implied = DELIVERY_EVENT_ORDER_STATUS[input.event];
  const needsStatusMove = !!implied && order.status !== implied;
  if (implied && needsStatusMove) {
    const allowed = STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
    if (!allowed.includes(implied)) {
      throw new CmsError(
        `Cannot record "${input.event}" — order ${order.number} is "${order.status}" and cannot become "${implied}"`,
        {
          statusCode: 400,
          referenceKind: "OrderStatus",
          availableOptions: allowed,
        },
      );
    }
  }

  if (input.courierId) {
    const courier = await prisma.courier.findUnique({
      where: { id: input.courierId },
      select: { id: true },
    });
    if (!courier) {
      const options = await prisma.courier.findMany({
        where: { active: true },
        select: { id: true, label: true },
        orderBy: { label: "asc" },
      });
      throw new CmsError("Courier not found", {
        statusCode: 404,
        availableOptions: options.map((c) => `${c.id} (${c.label})`),
        referenceKind: "courierId",
      });
    }
  }
  if (input.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: input.staffId },
      select: { id: true },
    });
    if (!staff) {
      throw new CmsError("Staff member not found", {
        statusCode: 404,
        referenceKind: "staffId",
      });
    }
  }

  const now = new Date();
  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryEvent.create({
      data: {
        orderId: order.id,
        event: input.event,
        courierId: input.courierId ?? null,
        trackingRef: input.trackingRef ?? null,
        codCollected: input.codCollected ?? null,
        landmark: input.landmark ?? null,
        recipientPhone: input.recipientPhone ?? null,
        staffId: input.staffId ?? null,
        note: input.note ?? null,
        createdAt: now,
        dateBs: adToBs(now),
      },
    });

    // Materialize. Only fields this event actually establishes are touched, so
    // a later event can't blank what an earlier one recorded.
    const patch: Record<string, unknown> = {};
    if (input.courierId) patch.courierId = input.courierId;
    if (input.trackingRef) patch.courierTrackingRef = input.trackingRef;
    if (input.landmark) patch.deliveryLandmark = input.landmark;
    if (input.recipientPhone) patch.recipientPhone = input.recipientPhone;
    if (input.event === "packed" && input.staffId) {
      patch.packedByStaffId = input.staffId;
    }
    if (input.event === "dispatched") patch.dispatchedAt = now;
    if (input.event === "delivered") {
      patch.deliveredAt = now;
      if (input.staffId) patch.deliveredByStaffId = input.staffId;
      if (input.codCollected != null) patch.codAmount = input.codCollected;
    }
    if (Object.keys(patch).length > 0) {
      await tx.order.update({ where: { id: order.id }, data: patch });
    }

    return created;
  });

  // After the log is durable: move the customer's view through the existing
  // machine, which is what sends them the email. Separate transaction because
  // updateOrderStatus owns its own (and its concurrency guard).
  //
  // A failure here must NOT look like the event failed — it is already written,
  // and the parcel really did leave the building. The legality of the move was
  // checked above, so what remains is a concurrent update or a mail problem:
  // report it alongside the event so the operator knows the log is right and
  // the customer's view is behind, instead of retrying and being told it was
  // already logged.
  let statusWarning: string | null = null;
  if (implied && needsStatusMove) {
    try {
      await updateOrderStatus(order.id, implied, {
        notes: `Delivery log: ${input.event}`,
        actor: input.actor,
      });
    } catch (err) {
      statusWarning =
        err instanceof CmsError
          ? err.message
          : `Logged, but the order status could not be moved to "${implied}".`;
      console.error("[fulfilment] status move failed after logging event", {
        orderId: order.id,
        event: input.event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { event, statusWarning };
}

export interface DeliveryLogFilters {
  orderId?: string;
  event?: DeliveryEventName;
  courierId?: string;
  staffId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/** The log itself, newest first — the delivery report's only source. */
export async function listDeliveryLog(filters: DeliveryLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));

  const where = {
    ...(filters.orderId ? { orderId: filters.orderId } : {}),
    ...(filters.event ? { event: filters.event } : {}),
    ...(filters.courierId ? { courierId: filters.courierId } : {}),
    ...(filters.staffId ? { staffId: filters.staffId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.deliveryEvent.findMany({
      where,
      include: {
        order: {
          select: { id: true, number: true, deliveryZone: true, total: true },
        },
        courier: { select: { id: true, label: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deliveryEvent.count({ where }),
  ]);

  return { events: rows, total, page, limit };
}

/**
 * Counts per event for a period — "12 delivered, 3 failed attempts" without
 * anyone tallying by hand.
 */
export async function countDeliveryEvents(
  filters: Omit<DeliveryLogFilters, "page" | "limit" | "event"> = {},
) {
  const grouped = await prisma.deliveryEvent.groupBy({
    by: ["event"],
    where: {
      ...(filters.orderId ? { orderId: filters.orderId } : {}),
      ...(filters.courierId ? { courierId: filters.courierId } : {}),
      ...(filters.staffId ? { staffId: filters.staffId } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    _count: { _all: true },
  });

  const out: Record<string, number> = {};
  for (const g of grouped) out[g.event] = g._count._all;
  return out;
}
