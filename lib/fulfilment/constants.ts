// Pure delivery-log constants — importable from client components (no prisma
// dependency). Server logic lives in lib/fulfilment/index.ts.

export const DELIVERY_EVENTS = [
  "packed", // boxed and ready to hand over
  "dispatched", // left the showroom, with a courier or a staff member
  "out_for_delivery", // courier's final leg; optional, some couriers report it
  "failed_attempt", // nobody home, wrong address, phone off — happens a lot
  "delivered", // in the customer's hands
  "returned", // came back after delivery
  "exchanged", // swapped for something else after delivery
] as const;

export type DeliveryEventName = (typeof DELIVERY_EVENTS)[number];

/**
 * What must ALREADY be in the log before each event can be recorded.
 *
 * An empty list means "nothing in the log yet is fine". These are deliberately
 * loose in one place: `dispatched` does not require `packed`, because a parcel
 * genuinely does sometimes go straight from the counter to a waiting rider, and
 * inventing a packed event nobody performed would be a lie in the log.
 */
export const DELIVERY_EVENT_REQUIRES: Record<
  DeliveryEventName,
  readonly DeliveryEventName[]
> = {
  packed: [],
  dispatched: [],
  out_for_delivery: ["dispatched"],
  failed_attempt: ["dispatched"],
  delivered: ["dispatched"],
  returned: ["delivered"],
  exchanged: ["delivered"],
};

/**
 * The customer-facing Order.status each event implies, when it implies one.
 *
 * This is the whole reason there is no second status column: recording a
 * dispatch moves the customer's view through the existing status machine (which
 * emails them), so the two can never drift apart. `returned` and `exchanged`
 * map to nothing — the customer-facing machine has no vocabulary for them yet,
 * and quietly reusing "delivered" would misreport what happened.
 */
export const DELIVERY_EVENT_ORDER_STATUS: Partial<
  Record<DeliveryEventName, "shipped" | "delivered">
> = {
  dispatched: "shipped",
  delivered: "delivered",
};

export function isDeliveryEvent(v: string): v is DeliveryEventName {
  return (DELIVERY_EVENTS as readonly string[]).includes(v);
}

/** Human label for the admin UI and the log view. */
export const DELIVERY_EVENT_LABELS: Record<DeliveryEventName, string> = {
  packed: "Packed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  failed_attempt: "Failed attempt",
  delivered: "Delivered",
  returned: "Returned",
  exchanged: "Exchanged",
};
