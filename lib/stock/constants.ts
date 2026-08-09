// Controlled vocabulary for the append-only stock ledger.

export const MOVEMENT_REASONS = [
  "sale", // confirmed sale decrement (PR 3)
  "order", // online-order fulfilment decrement (PR 4)
  "transfer", // showroom → showroom (two rows sharing a refId)
  "adjustment", // admin override / physical count delta
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
