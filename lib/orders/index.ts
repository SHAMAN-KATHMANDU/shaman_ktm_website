// Shared order write logic, used by the customer checkout route, the
// /api/sysuser/orders admin routes AND the MCP order tools — one
// implementation so pricing, stock and status rules can't drift (same
// pattern as lib/cms/*).
//
// Money follows the catalog convention: integers in whole NPR rupees.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { env } from "@/lib/env";
import { sendEmail, orderConfirmationEmail, orderStatusEmail } from "@/lib/email";
import { adToBs } from "@/lib/dates";
import { recordStockMovement } from "@/lib/stock";
import { ONLINE_POOL_KEY } from "@/lib/stock/constants";
import {
  markOrderPaid,
  REFUND_OWED,
  verifyOrderPayments,
} from "@/lib/payment/settle";
import { isFonepayConfigured } from "@/lib/payment/fonepay-intent";
import { voidOrderSale } from "@/lib/sales";

export {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  DELIVERY_ZONES,
  MAX_QUANTITY,
  type OrderStatus,
} from "./constants";
import {
  STATUS_TRANSITIONS,
  DELIVERY_ZONES,
  MAX_QUANTITY,
  type OrderStatus,
} from "./constants";

export interface OrderItemInput {
  productId: string;
  variationId?: string | null;
  quantity: number;
}

export interface DeliveryInput {
  name: string;
  phone: string;
  address: string;
  zone: (typeof DELIVERY_ZONES)[number];
  notes?: string | null;
}

function orderUrl(number: string): string {
  const origin = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return `${origin}/account/orders/${number}`;
}

async function generateOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  // upsert + atomic increment: concurrent checkouts serialize on the single
  // counter row instead of racing a read-modify-write.
  const counter = await tx.orderCounter.upsert({
    where: { id: 1 },
    update: { value: { increment: 1 } },
    create: { id: 1, value: 1 },
  });
  return `SK-${String(counter.value).padStart(6, "0")}`;
}

/**
 * Place an order for a customer. Prices, names and stock come from the DB —
 * client-supplied cart data is only a list of (productId, variationId, qty).
 * Throws CmsError on validation failures; the transaction rolls back whole.
 */
export async function createOrder(
  customerId: string,
  items: OrderItemInput[],
  delivery: DeliveryInput,
  paymentMethod: "cod" | "fonepay" = "cod",
) {
  if (items.length === 0) {
    throw new CmsError("Order has no items", { statusCode: 400 });
  }

  // Merge duplicate lines (same product+variation) so stock math is sane.
  const merged = new Map<string, OrderItemInput>();
  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
    ) {
      throw new CmsError(
        `Quantity must be an integer between 1 and ${MAX_QUANTITY}`,
        { statusCode: 400 },
      );
    }
    const key = `${item.productId}:${item.variationId ?? ""}`;
    const prev = merged.get(key);
    merged.set(
      key,
      prev
        ? { ...item, quantity: prev.quantity + item.quantity }
        : { ...item },
    );
  }
  const lines = [...merged.values()];
  for (const line of lines) {
    if (line.quantity > MAX_QUANTITY) {
      throw new CmsError(
        `Quantity must be an integer between 1 and ${MAX_QUANTITY}`,
        { statusCode: 400 },
      );
    }
  }

  // Lazily release Online stock held by abandoned Fonepay orders. Not awaited:
  // checkout must never wait on (or fail because of) the sweep.
  void expireUnpaidOrders().catch((err) =>
    console.error("[orders] unpaid-order sweep failed:", err),
  );

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    include: { variations: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const itemRows = lines.map((line) => {
    const product = byId.get(line.productId);
    if (!product || product.status !== "published") {
      throw new CmsError(
        `Product ${line.productId} is not available`,
        { statusCode: 400 },
      );
    }
    if (product.priceOnEnquiry) {
      throw new CmsError(
        `"${product.name}" is available on enquiry only and cannot be ordered online`,
        { statusCode: 400 },
      );
    }
    let price = product.price;
    let variationSku: string | null = null;
    // A variant product is priced and stocked per variation; ordering it at
    // product level would use the base price and skip every stock check.
    if (!line.variationId && product.variations.length > 0) {
      throw new CmsError(`Choose an option for "${product.name}"`, {
        statusCode: 400,
        referenceKind: "ProductVariation",
        availableOptions: product.variations
          .filter((v) => v.active)
          .map((v) => `${v.id} (${v.sku})`),
      });
    }
    if (line.variationId) {
      const variation = product.variations.find(
        (v) => v.id === line.variationId && v.active,
      );
      if (!variation) {
        throw new CmsError(
          `Unknown variation for "${product.name}"`,
          {
            statusCode: 400,
            referenceKind: "ProductVariation",
            availableOptions: product.variations
              .filter((v) => v.active)
              .map((v) => `${v.id} (${v.sku})`),
          },
        );
      }
      price = variation.price;
      variationSku = variation.sku;
    }
    return {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      thumbnailUrl: product.thumbnailUrl ?? product.images[0]?.url ?? null,
      variationId: line.variationId ?? null,
      variationSku,
      quantity: line.quantity,
      priceAtOrder: price,
      // Set at create: a failed debit below rolls the whole order back.
      stockDebited: !!line.variationId || product.stockQuantity != null,
    };
  });

  const subtotal = itemRows.reduce(
    (sum, r) => sum + r.priceAtOrder * r.quantity,
    0,
  );

  const order = await prisma.$transaction(async (tx) => {
    const number = await generateOrderNumber(tx);
    const created = await tx.order.create({
      data: {
        number,
        customerId,
        subtotal,
        total: subtotal, // no delivery fee / discounts in v1
        deliveryName: delivery.name,
        deliveryPhone: delivery.phone,
        deliveryAddress: delivery.address,
        deliveryZone: delivery.zone,
        deliveryNotes: delivery.notes ?? null,
        dateBs: adToBs(),
        paymentMethod,
        items: { create: itemRows },
        statusEvents: {
          create: { status: "pending", createdBy: "customer" },
        },
      },
      include: { items: true, statusEvents: true },
    });

    // Variant stock leaves the dedicated Online pool through the same guarded,
    // append-only path as showroom sales. The order row is created first only
    // so each movement can carry its stable id; any short pool throws and the
    // surrounding transaction rolls both the order and every movement back.
    for (const row of itemRows) {
      if (row.variationId) {
        try {
          await recordStockMovement(
            {
              variationId: row.variationId,
              showroomKey: ONLINE_POOL_KEY,
              delta: -row.quantity,
              reason: "order",
              refType: "Order",
              refId: created.id,
            },
            { tx },
          );
        } catch (err) {
          if (!(err instanceof CmsError) || err.statusCode !== 409) throw err;
          throw new CmsError(
            `"${row.productName}" (${row.variationSku}) has insufficient stock`,
            { statusCode: 422 },
          );
        }
        continue;
      }
      // Product-level stock: skip untracked products (stockQuantity == null).
      if (byId.get(row.productId)?.stockQuantity == null) continue;
      const updated = await tx.product.updateMany({
        where: { id: row.productId, stockQuantity: { gte: row.quantity } },
        data: { stockQuantity: { decrement: row.quantity } },
      });
      if (updated.count === 0) {
        throw new CmsError(
          `"${row.productName}" has insufficient stock`,
          { statusCode: 422 },
        );
      }
    }

    return created;
  });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true, name: true },
  });
  if (customer) {
    void sendEmail({
      to: customer.email,
      ...orderConfirmationEmail({
        name: customer.name,
        number: order.number,
        items: order.items,
        total: order.total,
        deliveryAddress: order.deliveryAddress,
        orderUrl: orderUrl(order.number),
      }),
    });
  }

  return order;
}

/**
 * Move an order to a new status. Enforces the transition map, appends a
 * timeline event, restores variation stock on cancellation, marks COD
 * payment collected on delivery when the cash covers the total (otherwise
 * returns a paymentWarning), and emails the customer.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  opts: { notes?: string | null; actor: string },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: { select: { email: true, name: true } } },
  });
  if (!order) {
    throw new CmsError("Order not found", { statusCode: 404 });
  }

  const allowed = STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new CmsError(
      `Cannot move order ${order.number} from "${order.status}" to "${newStatus}"`,
      {
        statusCode: 400,
        referenceKind: "OrderStatus",
        availableOptions: allowed,
      },
    );
  }

  // COD only: cash changes hands at the door, so delivery is payment — but
  // only when the cash recorded on the delivery covers the order. Prepaid
  // methods (fonepay) are settled by their own gateway path; marking such an
  // order delivered must NEVER mark it paid.
  const codDelivered = newStatus === "delivered" && order.paymentMethod === "cod";
  const codPaidInFull = codDelivered && order.codAmount === order.total;
  const paymentWarning =
    codDelivered && !codPaidInFull && order.paymentStatus === "pending"
      ? `Payment left pending: cash collected (${order.codAmount ?? "none recorded"}) does not match the order total (${order.total}). Record the delivery with the cash collected.`
      : null;

  const updated = await prisma.$transaction(async (tx) => {
    // Status-guarded write: if a concurrent caller (admin REST vs MCP) moved
    // the order first, this matches zero rows and we bail — which is what
    // makes the cancellation stock-restore below exactly-once.
    // paymentStatus is part of the guard too: a Fonepay settle landing between
    // our read and this write must not leave a paid order silently cancelled.
    const won = await tx.order.updateMany({
      where: { id: order.id, status: order.status, paymentStatus: order.paymentStatus },
      data: {
        status: newStatus,
        // Cancelling a paid order is allowed, but the money is then owed back.
        ...(newStatus === "cancelled" && order.paymentStatus === "completed"
          ? { paymentStatus: REFUND_OWED }
          : {}),
      },
    });
    if (won.count === 0) {
      throw new CmsError(
        `Order ${order.number} was updated concurrently — fetch it again and retry`,
        { statusCode: 409 },
      );
    }
    if (newStatus === "cancelled") {
      await voidOrderSale(tx, order.id, `Order ${order.number} cancelled`);
      const debits = await tx.stockMovement.findMany({
        where: {
          refType: "Order",
          refId: order.id,
          reason: "order",
          delta: { lt: 0 },
        },
      });
      const debitByVariation = new Map(
        debits.map((movement) => [movement.variationId, movement]),
      );
      for (const item of order.items) {
        if (item.variationId) {
          const original = debitByVariation.get(item.variationId);
          if (
            !original ||
            original.showroomKey !== ONLINE_POOL_KEY ||
            original.delta !== -item.quantity
          ) {
            throw new CmsError(
              `Order ${order.number} has no matching Online stock debit for variation ${item.variationId}`,
              { statusCode: 409 },
            );
          }
          const alreadyReversed = await tx.stockMovement.findFirst({
            where: { refType: "StockMovement", refId: original.id },
            select: { id: true },
          });
          if (alreadyReversed) {
            throw new CmsError(
              `Order ${order.number} stock was already restored`,
              { statusCode: 409 },
            );
          }
          await recordStockMovement(
            {
              variationId: item.variationId,
              showroomKey: original.showroomKey,
              delta: -original.delta,
              reason: "correction",
              refType: "StockMovement",
              refId: original.id,
              note: `Cancellation of ${order.number}`,
            },
            { tx },
          );
          continue;
        }
        // Restore product-level stock only for lines that actually took it;
        // claiming the flag makes the restore exactly-once.
        const claimed = await tx.orderItem.updateMany({
          where: { id: item.id, stockDebited: true },
          data: { stockDebited: false },
        });
        if (claimed.count === 0) continue;
        await tx.product.updateMany({
          where: { id: item.productId, stockQuantity: { not: null } },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }
    if (codPaidInFull) await markOrderPaid(tx, order.id);
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: newStatus,
        notes: opts.notes ?? null,
        createdBy: opts.actor,
      },
    });
    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, statusEvents: { orderBy: { createdAt: "asc" } } },
    });
  });

  void sendEmail({
    to: order.customer.email,
    ...orderStatusEmail({
      name: order.customer.name,
      number: order.number,
      status: newStatus,
      notes: opts.notes,
      orderUrl: orderUrl(order.number),
    }),
  });

  return { ...updated, paymentWarning };
}

/** How long a Fonepay order may sit unpaid before its stock is released. */
export const UNPAID_FONEPAY_ORDER_TTL_MINUTES = 60;
const EXPIRY_BATCH = 20;

/**
 * Cancel pending Fonepay orders still unpaid after `olderThanMinutes`, so the
 * Online stock they hold goes back on sale (updateOrderStatus restores it
 * exactly once). An order with an open payment attempt is first checked with
 * Fonepay — the customer may have paid and closed the tab — and is left alone
 * if it turns out paid, or if the gateway can't be asked. Returns how many
 * orders were cancelled.
 */
export async function expireUnpaidOrders(
  olderThanMinutes = UNPAID_FONEPAY_ORDER_TTL_MINUTES,
) {
  const stale = await prisma.order.findMany({
    where: {
      status: "pending",
      paymentMethod: "fonepay",
      paymentStatus: "pending",
      createdAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) },
    },
    select: {
      id: true,
      number: true,
      total: true,
      paymentTransactions: {
        where: { status: "pending", verified: false },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: EXPIRY_BATCH,
  });

  let cancelled = 0;
  for (const order of stale) {
    try {
      if (order.paymentTransactions.length > 0) {
        if (!isFonepayConfigured()) continue;
        const check = await verifyOrderPayments(order);
        if (check.paid || check.mismatch || check.gatewayError) continue;
      }
      await updateOrderStatus(order.id, "cancelled", {
        actor: "system",
        notes: `Unpaid Fonepay order expired after ${olderThanMinutes} minutes`,
      });
      cancelled++;
    } catch (err) {
      // e.g. a concurrent settle or staff action won the status guard (409).
      console.error(`[orders] could not expire ${order.number}:`, err);
    }
  }
  return cancelled;
}
