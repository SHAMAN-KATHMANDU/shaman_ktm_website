// Per-showroom stock ledger (spec Module: stock; grain = variation × showroom).
//
// `recordStockMovement()` is the ONLY write path to stock. It appends a
// StockMovement row (the source of truth), maintains the materialized
// StockLevel.qty for the (variation, showroom) pool, and resyncs
// ProductVariation.stock to the sum across pools so the storefront's
// availability checks keep working unchanged.
//
// The ledger is append-only: a mistake is corrected by a NEW reversing row
// (reason "correction", refType "StockMovement", refId = original id) — never
// by editing history. Pools are strictly separate per showroom (decision #7);
// a pool can never go negative.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import {
  MOVEMENT_REASONS,
  type MovementReason,
  type MovementRefType,
} from "./constants";

export interface MovementInput {
  variationId: string;
  showroomKey: string;
  /** Positive = into the pool, negative = out of the pool. Never zero. */
  delta: number;
  reason: MovementReason;
  refType?: MovementRefType;
  refId?: string;
  staffId?: string;
  note?: string;
}

type Db = Prisma.TransactionClient;

async function applyMovement(tx: Db, input: MovementInput) {
  const { variationId, showroomKey, delta } = input;

  if (!Number.isInteger(delta) || delta === 0) {
    throw new CmsError("Stock delta must be a non-zero integer", {
      statusCode: 400,
    });
  }
  if (!MOVEMENT_REASONS.includes(input.reason)) {
    throw new CmsError(`Unknown stock movement reason "${input.reason}"`, {
      statusCode: 400,
      availableOptions: [...MOVEMENT_REASONS],
      referenceKind: "reason",
    });
  }

  const variation = await tx.productVariation.findUnique({
    where: { id: variationId },
    select: { id: true },
  });
  if (!variation) {
    throw new CmsError("Product variation not found", {
      statusCode: 404,
      referenceKind: "variationId",
    });
  }
  const showroom = await tx.showroom.findUnique({
    where: { key: showroomKey },
    select: { key: true },
  });
  if (!showroom) {
    const keys = await tx.showroom.findMany({ select: { key: true } });
    throw new CmsError("Showroom not found", {
      statusCode: 404,
      availableOptions: keys.map((s) => s.key),
      referenceKind: "showroomKey",
    });
  }

  if (delta < 0) {
    // Guarded decrement: only succeeds when the pool holds enough. This is the
    // same no-race pattern the checkout uses for ProductVariation.stock.
    const updated = await tx.stockLevel.updateMany({
      where: { variationId, showroomKey, qty: { gte: -delta } },
      data: { qty: { decrement: -delta } },
    });
    if (updated.count === 0) {
      const level = await tx.stockLevel.findUnique({
        where: { variationId_showroomKey: { variationId, showroomKey } },
        select: { qty: true },
      });
      throw new CmsError(
        `Insufficient stock in "${showroomKey}" — have ${level?.qty ?? 0}, need ${-delta}`,
        { statusCode: 409 },
      );
    }
  } else {
    await tx.stockLevel.upsert({
      where: { variationId_showroomKey: { variationId, showroomKey } },
      update: { qty: { increment: delta } },
      create: { variationId, showroomKey, qty: delta },
    });
  }

  const movement = await tx.stockMovement.create({
    data: {
      variationId,
      showroomKey,
      delta,
      reason: input.reason,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      staffId: input.staffId ?? null,
      note: input.note ?? null,
    },
  });

  // Resync the variation-level materialized sum (storefront availability).
  const pools = await tx.stockLevel.aggregate({
    where: { variationId },
    _sum: { qty: true },
  });
  await tx.productVariation.update({
    where: { id: variationId },
    data: { stock: pools._sum.qty ?? 0 },
  });

  return movement;
}

/**
 * Append one stock movement and update the materialized levels atomically.
 * Pass `opts.tx` to compose inside a caller-owned transaction (e.g. PR 3's
 * confirmSale); otherwise this opens its own Serializable transaction.
 */
export async function recordStockMovement(
  input: MovementInput,
  opts: { tx?: Db } = {},
) {
  if (opts.tx) return applyMovement(opts.tx, input);
  return prisma.$transaction((tx) => applyMovement(tx, input), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

/**
 * Move stock between showroom pools: two ledger rows (−from, +to) sharing a
 * refId, applied atomically. Fails whole if the source pool is short.
 */
export async function transferStock(input: {
  variationId: string;
  fromShowroomKey: string;
  toShowroomKey: string;
  qty: number;
  staffId?: string;
  note?: string;
}) {
  if (!Number.isInteger(input.qty) || input.qty <= 0) {
    throw new CmsError("Transfer qty must be a positive integer", {
      statusCode: 400,
    });
  }
  if (input.fromShowroomKey === input.toShowroomKey) {
    throw new CmsError("Transfer source and destination are the same", {
      statusCode: 400,
    });
  }
  const refId = `tr_${crypto.randomUUID()}`;
  return prisma.$transaction(
    async (tx) => {
      const out = await applyMovement(tx, {
        variationId: input.variationId,
        showroomKey: input.fromShowroomKey,
        delta: -input.qty,
        reason: "transfer",
        refType: "Transfer",
        refId,
        staffId: input.staffId,
        note: input.note,
      });
      const into = await applyMovement(tx, {
        variationId: input.variationId,
        showroomKey: input.toShowroomKey,
        delta: input.qty,
        reason: "transfer",
        refType: "Transfer",
        refId,
        staffId: input.staffId,
        note: input.note,
      });
      return { out, in: into, refId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Correct an earlier movement by appending its exact reverse. The original row
 * is never touched (append-only rule).
 */
export async function correctStockMovement(input: {
  movementId: string;
  staffId?: string;
  note?: string;
}) {
  const original = await prisma.stockMovement.findUnique({
    where: { id: input.movementId },
  });
  if (!original) {
    throw new CmsError("Stock movement not found", { statusCode: 404 });
  }
  if (original.reason === "correction") {
    throw new CmsError("Cannot correct a correction — correct the original", {
      statusCode: 400,
    });
  }
  const alreadyCorrected = await prisma.stockMovement.findFirst({
    where: { refType: "StockMovement", refId: original.id },
    select: { id: true },
  });
  if (alreadyCorrected) {
    throw new CmsError("Movement already corrected", { statusCode: 409 });
  }
  return recordStockMovement({
    variationId: original.variationId,
    showroomKey: original.showroomKey,
    delta: -original.delta,
    reason: "correction",
    refType: "StockMovement",
    refId: original.id,
    staffId: input.staffId,
    note: input.note ?? `Reverses ${original.id}`,
  });
}

const MAX_PAGE_SIZE = 500;

export interface LedgerFilters {
  variationId?: string;
  showroomKey?: string;
  reason?: MovementReason;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/** Read-only, paginated ledger query (admin page + MCP list_stock_movements). */
export async function getLedger(filters: LedgerFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.StockMovementWhereInput = {
    ...(filters.variationId ? { variationId: filters.variationId } : {}),
    ...(filters.showroomKey ? { showroomKey: filters.showroomKey } : {}),
    ...(filters.reason ? { reason: filters.reason } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        variation: {
          select: {
            sku: true,
            label: true,
            product: { select: { name: true, slug: true } },
          },
        },
        staff: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { movements, total, page, limit };
}

/** Current per-pool stock levels (admin page + MCP list_stock). */
export async function getStockLevels(filters: {
  variationId?: string;
  showroomKey?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.StockLevelWhereInput = {
    ...(filters.variationId ? { variationId: filters.variationId } : {}),
    ...(filters.showroomKey ? { showroomKey: filters.showroomKey } : {}),
  };
  const [total, levels] = await Promise.all([
    prisma.stockLevel.count({ where }),
    prisma.stockLevel.findMany({
      where,
      orderBy: [{ showroomKey: "asc" }, { variationId: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        variation: {
          select: {
            sku: true,
            label: true,
            product: { select: { name: true, slug: true } },
          },
        },
      },
    }),
  ]);
  return { levels, total, page, limit };
}
