// Controlled vocabulary for the append-only stock ledger.

/** Inventory-only pool used by checkout. It is not a customer-facing showroom. */
export const ONLINE_POOL_KEY = "online";

/** Shared visibility boundary for locations a customer or staff member can visit. */
export const PHYSICAL_SHOWROOM_WHERE = { type: "showroom" } as const;

/** Prisma relation selection used anywhere customer-visible stock is returned. */
export const ONLINE_STOCK_LEVEL_SELECT = {
  where: { showroomKey: ONLINE_POOL_KEY },
  select: { qty: true },
  take: 1,
} as const;

export function onlineStockOf(v: { stockLevels: { qty: number }[] }): number {
  return v.stockLevels[0]?.qty ?? 0;
}

export const MOVEMENT_REASONS = [
  "sale", // confirmed sale decrement (PR 3)
  "order", // online-order fulfilment decrement (PR 4)
  "transfer", // showroom → showroom (two rows sharing a refId)
  "adjustment", // server-derived delta from an absolute physical count
  "return", // customer return back into a pool
  "correction", // reverses an earlier movement (refType "StockMovement")
  "initial_seed", // launch stock import (spec decision #14)
] as const;

export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const MOVEMENT_REF_TYPES = [
  "Sale",
  "Order",
  "StockMovement",
  "Transfer",
] as const;

export type MovementRefType = (typeof MOVEMENT_REF_TYPES)[number];
