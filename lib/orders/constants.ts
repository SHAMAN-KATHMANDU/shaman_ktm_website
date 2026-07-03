// Pure order-domain constants — importable from client components (no
// prisma/server dependencies). Server-side logic lives in lib/orders/index.ts.

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// pending → confirmed → shipped → delivered, cancellable until it ships.
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Per-line quantity ceiling, enforced by the API and mirrored in cart UI. */
export const MAX_QUANTITY = 99;

export const DELIVERY_ZONES = [
  "thamel",
  "jhamsikhel",
  "gongabu",
  "shipping",
] as const;
export type DeliveryZoneValue = (typeof DELIVERY_ZONES)[number];
