// Sales spine (spec Module B). One table for every channel; the brief's four
// separate sales asks are filters over it.
//
// The lifecycle is the whole design:
//
//   createSaleDraft  — records what was sold. Touches NO stock, so a bot or a
//                      half-finished form can never move inventory.
//   confirmSale      — one Serializable transaction: allocate saleNo, decrement
//                      the sale's showroom pool once per line via lib/stock,
//                      all-or-nothing. Optionally closes a CRM lead.
//   voidSale         — a confirmed sale is immutable, so this appends a NEW
//                      reversing sale (amounts negated, stock movements
//                      reversed) and marks the original void. History is never
//                      rewritten.
//
// Prices always come from the database, never from the client — a caller sends
// (productId, variationId, qty) and optional discounts, nothing more.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { recordStockMovement } from "@/lib/stock";
import { adToBs } from "@/lib/dates";
import {
  SALE_CHANNELS,
  SALE_INPUT_SOURCES,
  SALE_STAFF_ROLES,
  type SaleChannel,
  type SaleInputSource,
  type SaleStaffRole,
  type SaleStatus,
} from "./constants";

const MAX_PAGE_SIZE = 500;
const MAX_LINE_QTY = 10_000;

export interface SaleLineInput {
  productId: string;
  variationId?: string | null;
  qty: number;
  /** Optional override of the catalog price, in whole NPR. */
  unitPrice?: number;
  lineDiscount?: number;
  note?: string | null;
}

export interface CreateSaleDraftInput {
  channel: SaleChannel;
  showroomKey?: string | null;
  customerId?: string | null;
  b2bAccountId?: string | null;
  crmLeadId?: string | null;
  orderId?: string | null;
  lines: SaleLineInput[];
  discountAmount?: number;
  deliveryFee?: number;
  paymentMethodId?: string | null;
  paymentRef?: string | null;
  paymentEvidenceUrl?: string | null;
  inputSource: SaleInputSource;
  dateAd?: Date;
  notes?: string | null;
  /** Extra attribution beyond the recorder, e.g. who assisted or delivered. */
  staff?: { staffId: string; role: SaleStaffRole }[];
}

type Db = Prisma.TransactionClient;

/** Prices, names and MRP come from the DB; the caller only picks items. */
async function priceLines(tx: Db, lines: SaleLineInput[]) {
  if (lines.length === 0) {
    throw new CmsError("A sale needs at least one line", { statusCode: 400 });
  }

  // Merge duplicates so stock math and the printed receipt agree.
  const merged = new Map<string, SaleLineInput>();
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_LINE_QTY) {
      throw new CmsError(
        `Quantity must be a whole number between 1 and ${MAX_LINE_QTY}`,
        { statusCode: 400 },
      );
    }
    const key = `${line.productId}:${line.variationId ?? ""}`;
    const prev = merged.get(key);
    merged.set(
      key,
      prev ? { ...line, qty: prev.qty + line.qty } : { ...line },
    );
  }

  const priced: {
    data: Omit<Prisma.SaleLineCreateManyInput, "saleId">;
    variationId: string | null;
    qty: number;
  }[] = [];
  let subtotal = 0;

  for (const line of merged.values()) {
    const product = await tx.product.findUnique({
      where: { id: line.productId },
      select: { id: true, name: true, price: true, sku: true },
    });
    if (!product) {
      throw new CmsError(`No product with id "${line.productId}"`, {
        statusCode: 404,
        referenceKind: "productId",
      });
    }

    let variation: {
      id: string;
      sku: string;
      price: number;
      label: string | null;
      mrp: number | null;
      productId: string;
    } | null = null;
    if (line.variationId) {
      variation = await tx.productVariation.findUnique({
        where: { id: line.variationId },
        select: {
          id: true,
          sku: true,
          price: true,
          label: true,
          mrp: true,
          productId: true,
        },
      });
      if (!variation) {
        throw new CmsError(`No variation with id "${line.variationId}"`, {
          statusCode: 404,
          referenceKind: "variationId",
        });
      }
      // Guard against a mismatched pair, which would decrement the wrong pool.
      if (variation.productId !== product.id) {
        throw new CmsError(
          `Variation "${line.variationId}" does not belong to product "${product.id}"`,
          { statusCode: 400, referenceKind: "variationId" },
        );
      }
    }

    const unitPrice = line.unitPrice ?? variation?.price ?? product.price;
    if (!Number.isInteger(unitPrice) || unitPrice < 0) {
      throw new CmsError("unitPrice must be a whole number of rupees", {
        statusCode: 400,
      });
    }
    const lineDiscount = line.lineDiscount ?? 0;
    if (!Number.isInteger(lineDiscount) || lineDiscount < 0) {
      throw new CmsError("lineDiscount must be a whole number of rupees", {
        statusCode: 400,
      });
    }
    const lineTotal = unitPrice * line.qty - lineDiscount;
    if (lineTotal < 0) {
      throw new CmsError(
        `Line discount (${lineDiscount}) exceeds the line total for "${product.name}"`,
        { statusCode: 400 },
      );
    }

    subtotal += lineTotal;
    priced.push({
      variationId: variation?.id ?? null,
      qty: line.qty,
      data: {
        productId: product.id,
        variationId: variation?.id ?? null,
        productName: product.name,
        variantLabel: variation?.label ?? null,
        sku: variation?.sku ?? product.sku ?? null,
        qty: line.qty,
        unitMrp: variation?.mrp ?? null,
        unitPrice,
        lineDiscount,
        lineTotal,
        note: line.note ?? null,
      },
    });
  }

  return { priced, subtotal };
}

async function assertRefs(tx: Db, input: CreateSaleDraftInput) {
  if (!SALE_CHANNELS.includes(input.channel)) {
    throw new CmsError(`Unknown channel "${input.channel}"`, {
      statusCode: 400,
      availableOptions: [...SALE_CHANNELS],
      referenceKind: "channel",
    });
  }
  if (!SALE_INPUT_SOURCES.includes(input.inputSource)) {
    throw new CmsError(`Unknown input source "${input.inputSource}"`, {
      statusCode: 400,
      availableOptions: [...SALE_INPUT_SOURCES],
      referenceKind: "inputSource",
    });
  }
  if (input.showroomKey) {
    const showroom = await tx.showroom.findUnique({
      where: { key: input.showroomKey },
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
  }
  if (input.paymentMethodId) {
    const method = await tx.paymentMethodLookup.findUnique({
      where: { id: input.paymentMethodId },
      select: { id: true },
    });
    if (!method) {
      const options = await tx.paymentMethodLookup.findMany({
        where: { active: true },
        select: { id: true, label: true },
      });
      throw new CmsError("Payment method not found", {
        statusCode: 404,
        availableOptions: options.map((m) => `${m.id} (${m.label})`),
        referenceKind: "paymentMethodId",
      });
    }
  }
  if (input.crmLeadId) {
    const lead = await tx.crmLead.findUnique({
      where: { id: input.crmLeadId },
      select: { id: true },
    });
    if (!lead) {
      throw new CmsError("CRM lead not found", {
        statusCode: 404,
        referenceKind: "crmLeadId",
      });
    }
  }
  for (const s of input.staff ?? []) {
    if (!SALE_STAFF_ROLES.includes(s.role)) {
      throw new CmsError(`Unknown sale staff role "${s.role}"`, {
        statusCode: 400,
        availableOptions: [...SALE_STAFF_ROLES],
        referenceKind: "role",
      });
    }
    const staff = await tx.staff.findUnique({
      where: { id: s.staffId },
      select: { id: true },
    });
    if (!staff) {
      throw new CmsError(`Staff member "${s.staffId}" not found`, {
        statusCode: 404,
        referenceKind: "staffId",
      });
    }
  }
}

/**
 * Record a sale as a draft. Deliberately does not touch stock: nothing a bot or
 * an unfinished form does can move inventory until a human confirms.
 */
export async function createSaleDraft(
  input: CreateSaleDraftInput,
  enteredByStaffId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    await assertRefs(tx, input);
    if (enteredByStaffId) {
      const staff = await tx.staff.findUnique({
        where: { id: enteredByStaffId },
        select: { id: true },
      });
      if (!staff) {
        throw new CmsError(`Staff member "${enteredByStaffId}" not found`, {
          statusCode: 404,
          referenceKind: "enteredByStaffId",
        });
      }
    }

    const { priced, subtotal } = await priceLines(tx, input.lines);
    const discountAmount = input.discountAmount ?? 0;
    const deliveryFee = input.deliveryFee ?? 0;
    if (
      !Number.isInteger(discountAmount) ||
      discountAmount < 0 ||
      !Number.isInteger(deliveryFee) ||
      deliveryFee < 0
    ) {
      throw new CmsError(
        "discountAmount and deliveryFee must be whole rupee amounts",
        { statusCode: 400 },
      );
    }
    const totalAmount = subtotal - discountAmount + deliveryFee;
    if (totalAmount < 0) {
      throw new CmsError(
        `Discount (${discountAmount}) exceeds the sale subtotal (${subtotal})`,
        { statusCode: 400 },
      );
    }

    const dateAd = input.dateAd ?? new Date();
    const sale = await tx.sale.create({
      data: {
        // Drafts have no number yet — saleNo is allocated at confirm so the
        // sequence has no gaps from abandoned drafts.
        saleNo: `DRAFT-${crypto.randomUUID()}`,
        channel: input.channel,
        showroomKey: input.showroomKey ?? null,
        customerId: input.customerId ?? null,
        b2bAccountId: input.b2bAccountId ?? null,
        crmLeadId: input.crmLeadId ?? null,
        orderId: input.orderId ?? null,
        dateAd,
        dateBs: adToBs(dateAd),
        subtotal,
        discountAmount,
        deliveryFee,
        totalAmount,
        paymentMethodId: input.paymentMethodId ?? null,
        paymentRef: input.paymentRef ?? null,
        paymentEvidenceUrl: input.paymentEvidenceUrl ?? null,
        status: "draft",
        inputSource: input.inputSource,
        enteredByStaffId,
        notes: input.notes ?? null,
        lines: { createMany: { data: priced.map((p) => p.data) } },
        ...(input.staff?.length
          ? {
              staff: {
                createMany: {
                  data: input.staff.map((s) => ({
                    staffId: s.staffId,
                    role: s.role,
                  })),
                  skipDuplicates: true,
                },
              },
            }
          : {}),
      },
      include: { lines: true, staff: true },
    });
    return sale;
  });
}

async function nextSaleNo(tx: Db): Promise<string> {
  // upsert + atomic increment: concurrent confirms serialize on the single
  // counter row rather than racing a read-modify-write (same as OrderCounter).
  const counter = await tx.saleCounter.upsert({
    where: { id: 1 },
    update: { value: { increment: 1 } },
    create: { id: 1, value: 1 },
  });
  return `SL-${String(counter.value).padStart(6, "0")}`;
}

export interface ConfirmSaleInput {
  saleId: string;
  /** Required when the draft has no showroom yet (online packing, floaters). */
  showroomKey?: string | null;
  paymentMethodId?: string | null;
  paymentRef?: string | null;
  paymentEvidenceUrl?: string | null;
  confirmedByStaffId: string;
  /** Move a linked CRM lead to "purchase" as part of the same transaction. */
  closeCrmLead?: boolean;
}

/**
 * Confirm a draft: allocate its number and decrement the showroom pool once per
 * line. Serializable and all-or-nothing — if any pool is short, nothing moves
 * and the sale stays a draft.
 */
export async function confirmSale(input: ConfirmSaleInput) {
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: input.saleId },
        include: { lines: true },
      });
      if (!sale) throw new CmsError("Sale not found", { statusCode: 404 });
      if (sale.status !== "draft") {
        throw new CmsError(
          `Only a draft can be confirmed — this sale is "${sale.status}"`,
          { statusCode: 409 },
        );
      }

      const showroomKey = input.showroomKey ?? sale.showroomKey;
      if (!showroomKey) {
        const keys = await tx.showroom.findMany({ select: { key: true } });
        throw new CmsError(
          "Confirming a sale needs a showroom — its stock comes out of one pool",
          {
            statusCode: 400,
            availableOptions: keys.map((s) => s.key),
            referenceKind: "showroomKey",
          },
        );
      }
      const staff = await tx.staff.findUnique({
        where: { id: input.confirmedByStaffId },
        select: { id: true },
      });
      if (!staff) {
        throw new CmsError(
          `Staff member "${input.confirmedByStaffId}" not found`,
          { statusCode: 404, referenceKind: "confirmedByStaffId" },
        );
      }

      const saleNo = await nextSaleNo(tx);

      const confirmed = await tx.sale.update({
        where: { id: sale.id },
        data: {
          saleNo,
          status: "confirmed",
          showroomKey,
          confirmedAt: new Date(),
          ...(input.paymentMethodId !== undefined
            ? { paymentMethodId: input.paymentMethodId }
            : {}),
          ...(input.paymentRef !== undefined
            ? { paymentRef: input.paymentRef }
            : {}),
          ...(input.paymentEvidenceUrl !== undefined
            ? { paymentEvidenceUrl: input.paymentEvidenceUrl }
            : {}),
        },
      });

      // One ledger movement per stock-tracked line. Untracked lines (a product
      // with no variation) are skipped: the ledger's grain is the variation, so
      // there is no pool to draw from. Confirming still records the revenue.
      for (const line of sale.lines) {
        if (!line.variationId) continue;
        await recordStockMovement(
          {
            variationId: line.variationId,
            showroomKey,
            delta: -line.qty,
            reason: "sale",
            refType: "Sale",
            refId: sale.id,
            staffId: input.confirmedByStaffId,
          },
          { tx },
        );
      }

      // Close the loop from enquiry to revenue, in the same transaction so a
      // confirmed sale and a "purchase" lead can never disagree.
      if (input.closeCrmLead && sale.crmLeadId) {
        const lead = await tx.crmLead.findUnique({
          where: { id: sale.crmLeadId },
          select: { id: true, status: true },
        });
        if (lead && lead.status !== "purchase") {
          const fromStatus = lead.status;
          await tx.crmLead.update({
            where: { id: lead.id },
            data: { status: "purchase", linkedSaleId: sale.id },
          });
          await tx.crmLeadStatusHistory.create({
            data: {
              leadId: lead.id,
              fromStatus,
              toStatus: "purchase",
              changedByStaffId: input.confirmedByStaffId,
              note: `Sale ${saleNo} confirmed`,
            },
          });
        }
      }

      return confirmed;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Void a confirmed sale by appending its reverse. The original row is never
 * edited: it is marked void and a new sale carries the negated amounts, mirrored
 * lines, and reversing stock movements.
 */
export async function voidSale(input: {
  saleId: string;
  voidedByStaffId: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw new CmsError("Voiding a sale needs a reason", { statusCode: 400 });
  }
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: input.saleId },
        include: { lines: true, staff: true },
      });
      if (!sale) throw new CmsError("Sale not found", { statusCode: 404 });

      if (sale.status === "draft") {
        throw new CmsError(
          "A draft has no effects to reverse — discard it instead of voiding",
          { statusCode: 409 },
        );
      }
      if (sale.status === "void") {
        throw new CmsError("Sale is already void", { statusCode: 409 });
      }
      // A reversing sale is itself final; and a sale can only be reversed once
      // (enforced at the DB level too, by the unique reversesSaleId).
      if (sale.reversesSaleId) {
        throw new CmsError(
          "This sale is itself a reversal — reversals are final",
          { statusCode: 409 },
        );
      }
      const existingReversal = await tx.sale.findUnique({
        where: { reversesSaleId: sale.id },
        select: { id: true, saleNo: true },
      });
      if (existingReversal) {
        throw new CmsError(
          `Sale already reversed by ${existingReversal.saleNo}`,
          { statusCode: 409, availableOptions: [existingReversal.id] },
        );
      }

      const staff = await tx.staff.findUnique({
        where: { id: input.voidedByStaffId },
        select: { id: true },
      });
      if (!staff) {
        throw new CmsError(`Staff member "${input.voidedByStaffId}" not found`, {
          statusCode: 404,
          referenceKind: "voidedByStaffId",
        });
      }

      const saleNo = await nextSaleNo(tx);
      const dateAd = new Date();

      const reversal = await tx.sale.create({
        data: {
          saleNo,
          channel: sale.channel,
          showroomKey: sale.showroomKey,
          customerId: sale.customerId,
          b2bAccountId: sale.b2bAccountId,
          crmLeadId: sale.crmLeadId,
          dateAd,
          dateBs: adToBs(dateAd),
          // Negated so summing a period nets to the corrected figure.
          subtotal: -sale.subtotal,
          discountAmount: -sale.discountAmount,
          deliveryFee: -sale.deliveryFee,
          totalAmount: -sale.totalAmount,
          // Payment identifiers are copied verbatim so a debit and its credit
          // reconcile against the same reference.
          paymentMethodId: sale.paymentMethodId,
          paymentRef: sale.paymentRef,
          paymentEvidenceUrl: sale.paymentEvidenceUrl,
          status: "confirmed",
          reversesSaleId: sale.id,
          inputSource: sale.inputSource,
          enteredByStaffId: input.voidedByStaffId,
          confirmedAt: dateAd,
          notes: `Reverses ${sale.saleNo}: ${input.reason.trim()}`,
          lines: {
            createMany: {
              data: sale.lines.map((l) => ({
                productId: l.productId,
                variationId: l.variationId,
                productName: l.productName,
                variantLabel: l.variantLabel,
                sku: l.sku,
                qty: l.qty,
                unitMrp: l.unitMrp,
                unitPrice: l.unitPrice,
                lineDiscount: -l.lineDiscount,
                lineTotal: -l.lineTotal,
                note: l.note,
              })),
            },
          },
          ...(sale.staff.length
            ? {
                staff: {
                  createMany: {
                    data: sale.staff.map((s) => ({
                      staffId: s.staffId,
                      role: s.role,
                    })),
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        },
      });

      // Put the stock back, pool by pool.
      if (sale.showroomKey) {
        for (const line of sale.lines) {
          if (!line.variationId) continue;
          await recordStockMovement(
            {
              variationId: line.variationId,
              showroomKey: sale.showroomKey,
              delta: line.qty,
              reason: "correction",
              refType: "Sale",
              refId: reversal.id,
              staffId: input.voidedByStaffId,
              note: `Reverses ${sale.saleNo}`,
            },
            { tx },
          );
        }
      }

      const voided = await tx.sale.update({
        where: { id: sale.id },
        data: { status: "void", voidedAt: dateAd },
      });

      return { voided, reversal };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** Discard a draft outright — nothing happened, so nothing needs reversing. */
export async function discardSaleDraft(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true, status: true },
  });
  if (!sale) throw new CmsError("Sale not found", { statusCode: 404 });
  if (sale.status !== "draft") {
    throw new CmsError(
      `Only a draft can be discarded — void the sale instead (status "${sale.status}")`,
      { statusCode: 409 },
    );
  }
  await prisma.sale.delete({ where: { id: saleId } });
  return { id: saleId };
}

export interface SaleFilters {
  channel?: SaleChannel;
  status?: SaleStatus;
  showroomKey?: string;
  crmLeadId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

function whereFromFilters(f: SaleFilters): Prisma.SaleWhereInput {
  return {
    ...(f.channel ? { channel: f.channel } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.showroomKey ? { showroomKey: f.showroomKey } : {}),
    ...(f.crmLeadId ? { crmLeadId: f.crmLeadId } : {}),
    ...(f.customerId ? { customerId: f.customerId } : {}),
    ...(f.from || f.to
      ? {
          dateAd: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: f.to } : {}),
          },
        }
      : {}),
  };
}

export async function listSales(filters: SaleFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where = whereFromFilters(filters);
  const [total, sales, totals] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { dateAd: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        showroom: { select: { key: true, name: true } },
        paymentMethod: { select: { id: true, label: true } },
        enteredByStaff: { select: { id: true, name: true } },
        crmLead: { select: { id: true, name: true } },
        staff: { include: { staff: { select: { id: true, name: true } } } },
        _count: { select: { lines: true } },
      },
    }),
    // Every non-draft row, which is what makes the figure both correct and
    // stable. Drafts aren't revenue yet. A voided sale KEEPS its amount in the
    // month it happened and its reversal carries the negative into the month
    // the correction was made — so an already-closed month never changes
    // retroactively, and the all-time sum still nets to the truth. (Summing
    // only `confirmed` would silently erase revenue from a closed month the
    // moment someone voided an old sale.)
    prisma.sale.aggregate({
      where: { ...where, status: { not: "draft" } },
      _sum: { totalAmount: true },
    }),
  ]);
  return {
    sales,
    total,
    page,
    limit,
    netRevenue: totals._sum.totalAmount ?? 0,
  };
}

export async function getSale(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      lines: { orderBy: { id: "asc" } },
      showroom: { select: { key: true, name: true } },
      paymentMethod: { select: { id: true, label: true, channel: true } },
      enteredByStaff: { select: { id: true, name: true } },
      crmLead: { select: { id: true, name: true, status: true } },
      customer: { select: { id: true, name: true, email: true } },
      staff: { include: { staff: { select: { id: true, name: true } } } },
      reverses: { select: { id: true, saleNo: true } },
      reversedBy: { select: { id: true, saleNo: true } },
    },
  });
  if (!sale) throw new CmsError("Sale not found", { statusCode: 404 });
  return sale;
}
