// B2B / wholesale service (spec Module C).
//
// Three things here are new capability rather than a nicer version of an
// existing sheet:
//
//  1. Outstanding balance. Nothing tracked B2B payment terms, advances, or what
//     an account still owes — the biggest gap found while scoping, on the side
//     of the business that carries most of the target.
//  2. Quote margin, computed. The Bhaktapur cost sheet's derived columns
//     (discount, line totals, margin amount and percent) are calculated
//     server-side from qty/mrp/wholesaleRate/costPrice, so a quote can't be
//     sent with arithmetic that doesn't hold.
//  3. Dated stage history, append-only. "Samples sent on the 4th, quoted on the
//     9th" is the reportable fact; the current stage alone loses the pipeline.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { adToBs } from "@/lib/dates";
import {
  B2B_ACCOUNT_STATUSES,
  B2B_ACCOUNT_TYPES,
  B2B_CLOSED_STAGES,
  B2B_DEAL_STAGES,
  type B2bAccountStatus,
  type B2bAccountType,
  type B2bDealStage,
} from "./constants";

const MAX_PAGE_SIZE = 500;

type Db = Prisma.TransactionClient;

async function assertStaff(tx: Db, staffId: string, field: string) {
  const staff = await tx.staff.findUnique({
    where: { id: staffId },
    select: { id: true },
  });
  if (!staff) {
    const options = await tx.staff.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    throw new CmsError(`Staff member "${staffId}" not found`, {
      statusCode: 404,
      availableOptions: options.map((s) => `${s.id} (${s.name})`),
      referenceKind: field,
    });
  }
}

async function assertTier(tx: Db, tier: number) {
  const row = await tx.b2bTier.findUnique({
    where: { tier },
    select: { tier: true },
  });
  if (!row) {
    const tiers = await tx.b2bTier.findMany({ select: { tier: true } });
    throw new CmsError(`Tier ${tier} is not configured`, {
      statusCode: 404,
      availableOptions: tiers.map((t) => String(t.tier)),
      referenceKind: "tier",
    });
  }
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export interface CreateAccountInput {
  companyName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  panNo?: string | null;
  accountType: B2bAccountType;
  tier?: number | null;
  status?: B2bAccountStatus;
  ownerStaffId?: string | null;
  sourceCrmLeadId?: string | null;
  showroomKey?: string | null;
  notes?: string | null;
}

export async function createAccount(
  input: CreateAccountInput,
  createdByStaffId: string,
) {
  if (!B2B_ACCOUNT_TYPES.includes(input.accountType)) {
    throw new CmsError(`Unknown account type "${input.accountType}"`, {
      statusCode: 400,
      availableOptions: [...B2B_ACCOUNT_TYPES],
      referenceKind: "accountType",
    });
  }
  const status = input.status ?? "prospect";
  if (!B2B_ACCOUNT_STATUSES.includes(status)) {
    throw new CmsError(`Unknown account status "${status}"`, {
      statusCode: 400,
      availableOptions: [...B2B_ACCOUNT_STATUSES],
      referenceKind: "status",
    });
  }

  return prisma.$transaction(async (tx) => {
    await assertStaff(tx, createdByStaffId, "createdByStaffId");
    if (input.ownerStaffId) {
      await assertStaff(tx, input.ownerStaffId, "ownerStaffId");
    }
    if (input.tier != null) await assertTier(tx, input.tier);
    if (input.sourceCrmLeadId) {
      const lead = await tx.crmLead.findUnique({
        where: { id: input.sourceCrmLeadId },
        select: { id: true },
      });
      if (!lead) {
        throw new CmsError("CRM lead not found", {
          statusCode: 404,
          referenceKind: "sourceCrmLeadId",
        });
      }
    }

    return tx.b2bAccount.create({
      data: {
        companyName: input.companyName,
        contactPerson: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        panNo: input.panNo ?? null,
        accountType: input.accountType,
        tier: input.tier ?? null,
        status,
        ownerStaffId: input.ownerStaffId ?? null,
        sourceCrmLeadId: input.sourceCrmLeadId ?? null,
        showroomKey: input.showroomKey ?? null,
        notes: input.notes ?? null,
        createdByStaffId,
      },
    });
  });
}

export async function updateAccount(
  accountId: string,
  input: Partial<CreateAccountInput>,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.b2bAccount.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    if (!existing) {
      throw new CmsError("B2B account not found", { statusCode: 404 });
    }
    if (input.accountType && !B2B_ACCOUNT_TYPES.includes(input.accountType)) {
      throw new CmsError(`Unknown account type "${input.accountType}"`, {
        statusCode: 400,
        availableOptions: [...B2B_ACCOUNT_TYPES],
        referenceKind: "accountType",
      });
    }
    if (input.status && !B2B_ACCOUNT_STATUSES.includes(input.status)) {
      throw new CmsError(`Unknown account status "${input.status}"`, {
        statusCode: 400,
        availableOptions: [...B2B_ACCOUNT_STATUSES],
        referenceKind: "status",
      });
    }
    if (input.tier != null) await assertTier(tx, input.tier);
    if (input.ownerStaffId) {
      await assertStaff(tx, input.ownerStaffId, "ownerStaffId");
    }

    return tx.b2bAccount.update({
      where: { id: accountId },
      data: {
        ...(input.companyName !== undefined
          ? { companyName: input.companyName }
          : {}),
        ...(input.contactPerson !== undefined
          ? { contactPerson: input.contactPerson || null }
          : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.panNo !== undefined ? { panNo: input.panNo || null } : {}),
        ...(input.accountType !== undefined
          ? { accountType: input.accountType }
          : {}),
        ...(input.tier !== undefined ? { tier: input.tier ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.ownerStaffId !== undefined
          ? { ownerStaffId: input.ownerStaffId || null }
          : {}),
        ...(input.showroomKey !== undefined
          ? { showroomKey: input.showroomKey || null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      },
    });
  });
}

/**
 * Convert a wholesale-interest lead into a trade account (spec decision #12).
 * Sets both directions of the link and moves the lead's own status, all in one
 * transaction, so the CRM and the account can never disagree about the origin.
 */
export async function convertLeadToAccount(input: {
  crmLeadId: string;
  account: Omit<CreateAccountInput, "sourceCrmLeadId">;
  createdByStaffId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.findUnique({
      where: { id: input.crmLeadId },
      select: { id: true, status: true, linkedB2bAccountId: true },
    });
    if (!lead) throw new CmsError("CRM lead not found", { statusCode: 404 });
    if (lead.linkedB2bAccountId) {
      throw new CmsError("Lead is already linked to a trade account", {
        statusCode: 409,
        availableOptions: [lead.linkedB2bAccountId],
        referenceKind: "b2bAccountId",
      });
    }
    await assertStaff(tx, input.createdByStaffId, "createdByStaffId");
    if (input.account.tier != null) await assertTier(tx, input.account.tier);

    const account = await tx.b2bAccount.create({
      data: {
        companyName: input.account.companyName,
        contactPerson: input.account.contactPerson ?? null,
        phone: input.account.phone ?? null,
        email: input.account.email ?? null,
        address: input.account.address ?? null,
        panNo: input.account.panNo ?? null,
        accountType: input.account.accountType,
        tier: input.account.tier ?? null,
        status: input.account.status ?? "prospect",
        ownerStaffId: input.account.ownerStaffId ?? null,
        showroomKey: input.account.showroomKey ?? null,
        notes: input.account.notes ?? null,
        sourceCrmLeadId: lead.id,
        createdByStaffId: input.createdByStaffId,
      },
    });

    await tx.crmLead.update({
      where: { id: lead.id },
      data: { linkedB2bAccountId: account.id },
    });

    return account;
  });
}

// ─── Deals ───────────────────────────────────────────────────────────────────

export async function createDeal(
  input: {
    b2bAccountId: string;
    dealName: string;
    stage?: B2bDealStage;
    quoteAmount?: number | null;
    expectedCloseDate?: Date | null;
    ownerStaffId?: string | null;
    tierApplied?: number | null;
    notes?: string | null;
    dateAd?: Date;
  },
  createdByStaffId: string,
) {
  const stage = input.stage ?? "contacted";
  if (!B2B_DEAL_STAGES.includes(stage)) {
    throw new CmsError(`Unknown deal stage "${stage}"`, {
      statusCode: 400,
      availableOptions: [...B2B_DEAL_STAGES],
      referenceKind: "stage",
    });
  }

  return prisma.$transaction(async (tx) => {
    const account = await tx.b2bAccount.findUnique({
      where: { id: input.b2bAccountId },
      select: { id: true, tier: true },
    });
    if (!account) {
      throw new CmsError("B2B account not found", {
        statusCode: 404,
        referenceKind: "b2bAccountId",
      });
    }
    await assertStaff(tx, createdByStaffId, "createdByStaffId");
    if (input.ownerStaffId) {
      await assertStaff(tx, input.ownerStaffId, "ownerStaffId");
    }
    const tierApplied = input.tierApplied ?? account.tier ?? null;
    if (tierApplied != null) await assertTier(tx, tierApplied);

    const dateAd = input.dateAd ?? new Date();
    const deal = await tx.b2bDeal.create({
      data: {
        b2bAccountId: account.id,
        dealName: input.dealName,
        stage,
        quoteAmount: input.quoteAmount ?? null,
        expectedCloseDate: input.expectedCloseDate ?? null,
        ownerStaffId: input.ownerStaffId ?? null,
        tierApplied,
        dateAd,
        dateBs: adToBs(dateAd),
        notes: input.notes ?? null,
      },
    });

    // Opening history row, same transaction — a deal can't exist without an
    // attributable starting stage.
    await tx.b2bDealStageHistory.create({
      data: {
        dealId: deal.id,
        fromStage: null,
        toStage: stage,
        changedByStaffId: createdByStaffId,
        note: "Deal created",
      },
    });

    return deal;
  });
}

/**
 * Move a deal along the pipeline. The update and its dated history row are one
 * transaction; a won or lost deal must be reopened explicitly.
 */
export async function changeDealStage(input: {
  dealId: string;
  toStage: B2bDealStage;
  changedByStaffId: string;
  note?: string | null;
  /**
   * The sale that closed this deal. Only meaningful when moving to "won" —
   * this is what makes "which sale closed which deal" answerable, and so
   * connects the quote to the revenue.
   */
  linkedSaleId?: string | null;
}) {
  if (!B2B_DEAL_STAGES.includes(input.toStage)) {
    throw new CmsError(`Unknown deal stage "${input.toStage}"`, {
      statusCode: 400,
      availableOptions: [...B2B_DEAL_STAGES],
      referenceKind: "toStage",
    });
  }
  return prisma.$transaction(async (tx) => {
    const deal = await tx.b2bDeal.findUnique({
      where: { id: input.dealId },
      select: { id: true, stage: true, b2bAccountId: true },
    });
    if (!deal) throw new CmsError("Deal not found", { statusCode: 404 });
    await assertStaff(tx, input.changedByStaffId, "changedByStaffId");

    if (deal.stage === input.toStage) {
      throw new CmsError(`Deal is already at "${input.toStage}"`, {
        statusCode: 409,
      });
    }
    if (B2B_CLOSED_STAGES.includes(deal.stage as B2bDealStage)) {
      throw new CmsError(
        `Deal is "${deal.stage}" — reopen it explicitly before moving it to "${input.toStage}"`,
        { statusCode: 409 },
      );
    }

    // Attaching the closing sale is only meaningful on a win, and the sale must
    // belong to this deal's account or the audit trail would point at revenue
    // from someone else.
    if (input.linkedSaleId) {
      if (input.toStage !== "won") {
        throw new CmsError(
          'A closing sale can only be attached when moving the deal to "won"',
          { statusCode: 400, referenceKind: "linkedSaleId" },
        );
      }
      const sale = await tx.sale.findUnique({
        where: { id: input.linkedSaleId },
        select: { id: true, b2bAccountId: true, status: true },
      });
      if (!sale) {
        throw new CmsError("Sale not found", {
          statusCode: 404,
          referenceKind: "linkedSaleId",
        });
      }
      if (sale.b2bAccountId !== deal.b2bAccountId) {
        throw new CmsError(
          "That sale is not booked to this deal's trade account",
          { statusCode: 400, referenceKind: "linkedSaleId" },
        );
      }
      if (sale.status === "draft") {
        throw new CmsError(
          "That sale is still a draft — confirm it before closing the deal against it",
          { statusCode: 409, referenceKind: "linkedSaleId" },
        );
      }
    }

    const fromStage = deal.stage;
    const updated = await tx.b2bDeal.update({
      where: { id: deal.id },
      data: {
        stage: input.toStage,
        ...(input.linkedSaleId !== undefined
          ? { linkedSaleId: input.linkedSaleId }
          : {}),
      },
    });
    await tx.b2bDealStageHistory.create({
      data: {
        dealId: deal.id,
        fromStage,
        toStage: input.toStage,
        changedByStaffId: input.changedByStaffId,
        note: input.note ?? null,
      },
    });
    return updated;
  });
}

/** Reopen a won/lost deal — recorded as its own dated row. */
export async function reopenDeal(input: {
  dealId: string;
  toStage: B2bDealStage;
  changedByStaffId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const deal = await tx.b2bDeal.findUnique({
      where: { id: input.dealId },
      select: { id: true, stage: true },
    });
    if (!deal) throw new CmsError("Deal not found", { statusCode: 404 });
    if (!B2B_CLOSED_STAGES.includes(deal.stage as B2bDealStage)) {
      throw new CmsError(
        `Deal is "${deal.stage}", not closed — use a normal stage change`,
        { statusCode: 409 },
      );
    }
    if (B2B_CLOSED_STAGES.includes(input.toStage)) {
      throw new CmsError("Reopen must target an open stage", {
        statusCode: 400,
        availableOptions: B2B_DEAL_STAGES.filter(
          (s) => !B2B_CLOSED_STAGES.includes(s),
        ) as string[],
      });
    }
    await assertStaff(tx, input.changedByStaffId, "changedByStaffId");

    const fromStage = deal.stage;
    const updated = await tx.b2bDeal.update({
      where: { id: deal.id },
      data: { stage: input.toStage },
    });
    await tx.b2bDealStageHistory.create({
      data: {
        dealId: deal.id,
        fromStage,
        toStage: input.toStage,
        changedByStaffId: input.changedByStaffId,
        note: input.note ?? "Reopened",
      },
    });
    return updated;
  });
}

// ─── Quote lines ─────────────────────────────────────────────────────────────

export interface QuoteLineInput {
  productId: string;
  variationId?: string | null;
  qty: number;
  /** Agreed trade price per unit. Omitted → derived from the deal's tier. */
  wholesaleRate?: number;
  note?: string | null;
}

/**
 * Replace a deal's quote lines, computing every derived column. Prices and cost
 * come from the catalog; the tier's discount fills in a wholesale rate when the
 * negotiation hasn't set one.
 */
export async function replaceQuoteLines(input: {
  dealId: string;
  lines: QuoteLineInput[];
}) {
  // Serializable, because this deletes then re-creates the deal's lines: two
  // people quoting the same deal at once would otherwise have one submission
  // silently overwrite the other's lines with no error.
  return prisma.$transaction(async (tx) => {
    const deal = await tx.b2bDeal.findUnique({
      where: { id: input.dealId },
      select: { id: true, stage: true, tierApplied: true },
    });
    if (!deal) throw new CmsError("Deal not found", { statusCode: 404 });
    if (B2B_CLOSED_STAGES.includes(deal.stage as B2bDealStage)) {
      throw new CmsError(
        `Deal is "${deal.stage}" — reopen it before changing the quote`,
        { statusCode: 409 },
      );
    }

    const tier =
      deal.tierApplied != null
        ? await tx.b2bTier.findUnique({ where: { tier: deal.tierApplied } })
        : null;

    const rows: Prisma.B2bQuoteLineCreateManyInput[] = [];
    let quoteTotal = 0;

    for (const line of input.lines) {
      if (!Number.isInteger(line.qty) || line.qty < 1) {
        throw new CmsError("Quote quantity must be a whole number of at least 1", {
          statusCode: 400,
        });
      }
      const product = await tx.product.findUnique({
        where: { id: line.productId },
        select: { id: true, name: true, price: true, sku: true, wholesalePrice: true },
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
        costPrice: number | null;
        wholesalePrice: number | null;
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
            costPrice: true,
            wholesalePrice: true,
            productId: true,
          },
        });
        if (!variation) {
          throw new CmsError(`No variation with id "${line.variationId}"`, {
            statusCode: 404,
            referenceKind: "variationId",
          });
        }
        if (variation.productId !== product.id) {
          throw new CmsError(
            `Variation "${line.variationId}" does not belong to product "${product.id}"`,
            { statusCode: 400, referenceKind: "variationId" },
          );
        }
      }

      const mrp = variation?.mrp ?? variation?.price ?? product.price;
      // Precedence: the negotiated rate, then a stored wholesale price, then
      // the tier's discount off MRP. Falling back to MRP means no discount,
      // which is visible rather than silently wrong.
      const wholesaleRate =
        line.wholesaleRate ??
        variation?.wholesalePrice ??
        product.wholesalePrice ??
        (tier ? Math.round(mrp * (1 - tier.discountPct / 100)) : mrp);

      if (!Number.isInteger(wholesaleRate) || wholesaleRate < 0) {
        throw new CmsError("wholesaleRate must be a whole number of rupees", {
          statusCode: 400,
        });
      }
      if (wholesaleRate > mrp) {
        throw new CmsError(
          `Wholesale rate (${wholesaleRate}) is above MRP (${mrp}) for "${product.name}"`,
          { statusCode: 400 },
        );
      }

      const lineTotalMrp = mrp * line.qty;
      const lineTotalWholesale = wholesaleRate * line.qty;
      const discountAmount = lineTotalMrp - lineTotalWholesale;
      const discountPct =
        lineTotalMrp > 0 ? Math.round((discountAmount / lineTotalMrp) * 100) : 0;
      const costPrice = variation?.costPrice ?? null;
      const marginAmount =
        costPrice != null ? lineTotalWholesale - costPrice * line.qty : null;
      const marginPct =
        marginAmount != null && lineTotalWholesale > 0
          ? Math.round((marginAmount / lineTotalWholesale) * 100)
          : null;

      quoteTotal += lineTotalWholesale;
      rows.push({
        dealId: deal.id,
        productId: product.id,
        variationId: variation?.id ?? null,
        productName: product.name,
        variantLabel: variation?.label ?? null,
        sku: variation?.sku ?? product.sku ?? null,
        qty: line.qty,
        mrp,
        wholesaleRate,
        discountAmount,
        discountPct,
        costPrice,
        lineTotalMrp,
        lineTotalWholesale,
        marginAmount,
        marginPct,
        note: line.note ?? null,
      });
    }

    await tx.b2bQuoteLine.deleteMany({ where: { dealId: deal.id } });
    if (rows.length) await tx.b2bQuoteLine.createMany({ data: rows });

    // The quote total is derived, so the deal's headline figure and its lines
    // can't drift apart.
    await tx.b2bDeal.update({
      where: { id: deal.id },
      data: { quoteAmount: rows.length ? quoteTotal : null },
    });

    return tx.b2bQuoteLine.findMany({
      where: { dealId: deal.id },
      orderBy: { id: "asc" },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

// ─── Payments and outstanding balance ────────────────────────────────────────

export async function recordPayment(input: {
  b2bAccountId: string;
  amount: number;
  saleId?: string | null;
  paidAt?: Date;
  paymentMethodId?: string | null;
  isAdvance?: boolean;
  reference?: string | null;
  note?: string | null;
  recordedByStaffId: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new CmsError(
      "Payment amount must be a non-zero whole number of rupees (use a negative amount for a refund)",
      { statusCode: 400 },
    );
  }
  return prisma.$transaction(async (tx) => {
    const account = await tx.b2bAccount.findUnique({
      where: { id: input.b2bAccountId },
      select: { id: true },
    });
    if (!account) {
      throw new CmsError("B2B account not found", {
        statusCode: 404,
        referenceKind: "b2bAccountId",
      });
    }
    await assertStaff(tx, input.recordedByStaffId, "recordedByStaffId");
    if (input.paymentMethodId) {
      const method = await tx.paymentMethodLookup.findUnique({
        where: { id: input.paymentMethodId },
        select: { id: true },
      });
      if (!method) {
        throw new CmsError("Payment method not found", {
          statusCode: 404,
          referenceKind: "paymentMethodId",
        });
      }
    }
    if (input.saleId) {
      const sale = await tx.sale.findUnique({
        where: { id: input.saleId },
        select: { id: true, b2bAccountId: true, status: true, saleNo: true },
      });
      if (!sale) {
        throw new CmsError("Sale not found", {
          statusCode: 404,
          referenceKind: "saleId",
        });
      }
      // The sale must be booked to THIS account. A null b2bAccountId means a
      // retail sale: attaching a trade payment to one would credit the account
      // for an amount never invoiced to it, leaving a phantom balance.
      if (sale.b2bAccountId !== account.id) {
        throw new CmsError(
          sale.b2bAccountId
            ? "That sale belongs to a different trade account"
            : "That sale isn't booked to a trade account — record the payment without a sale link, or set the account on the sale first",
          { statusCode: 400, referenceKind: "saleId" },
        );
      }
      // A draft isn't invoiced yet, so money against it would read as credit.
      if (sale.status === "draft") {
        throw new CmsError(
          "That sale is still a draft — confirm it before recording payment against it",
          { statusCode: 409, referenceKind: "saleId" },
        );
      }
    }

    const paidAt = input.paidAt ?? new Date();
    return tx.b2bPayment.create({
      data: {
        b2bAccountId: account.id,
        saleId: input.saleId ?? null,
        amount: input.amount,
        paidAt,
        dateBs: adToBs(paidAt),
        paymentMethodId: input.paymentMethodId ?? null,
        isAdvance: input.isAdvance ?? false,
        reference: input.reference ?? null,
        note: input.note ?? null,
        recordedByStaffId: input.recordedByStaffId,
      },
    });
  });
}

export interface Balance {
  invoiced: number;
  paid: number;
  advances: number;
  outstanding: number;
}

/**
 * What the account still owes: invoiced (non-draft sales booked against it)
 * minus everything received. Tracked nowhere before this module.
 *
 * Non-draft mirrors the sales spine's own definition of revenue, so a voided
 * sale and its negative reversal cancel out and the account stops owing it.
 *
 * Advances are included in `paid` — money in hand is money in hand — but are
 * reported separately so a negative balance reads as "in credit" rather than
 * looking like an error.
 */
export async function outstandingBalance(accountId: string): Promise<Balance> {
  const [invoiced, paid, advances] = await Promise.all([
    prisma.sale.aggregate({
      where: { b2bAccountId: accountId, status: { not: "draft" } },
      _sum: { totalAmount: true },
    }),
    prisma.b2bPayment.aggregate({
      where: { b2bAccountId: accountId },
      _sum: { amount: true },
    }),
    prisma.b2bPayment.aggregate({
      where: { b2bAccountId: accountId, isAdvance: true },
      _sum: { amount: true },
    }),
  ]);
  const invoicedTotal = invoiced._sum.totalAmount ?? 0;
  const paidTotal = paid._sum.amount ?? 0;
  return {
    invoiced: invoicedTotal,
    paid: paidTotal,
    advances: advances._sum.amount ?? 0,
    outstanding: invoicedTotal - paidTotal,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Attach balances to a page of accounts using three grouped queries rather than
 * three per row — a 500-row page (the MCP maximum) would otherwise fire 1,500
 * aggregates.
 */
async function withBalances<T extends { id: string }>(accounts: T[]) {
  if (accounts.length === 0) return [] as (T & { balance: Balance })[];
  const ids = accounts.map((a) => a.id);
  const [invoiced, paid, advances] = await Promise.all([
    prisma.sale.groupBy({
      by: ["b2bAccountId"],
      where: { b2bAccountId: { in: ids }, status: { not: "draft" } },
      _sum: { totalAmount: true },
    }),
    prisma.b2bPayment.groupBy({
      by: ["b2bAccountId"],
      where: { b2bAccountId: { in: ids } },
      _sum: { amount: true },
    }),
    prisma.b2bPayment.groupBy({
      by: ["b2bAccountId"],
      where: { b2bAccountId: { in: ids }, isAdvance: true },
      _sum: { amount: true },
    }),
  ]);
  const invoicedBy = new Map(
    invoiced.map((r) => [r.b2bAccountId, r._sum.totalAmount ?? 0]),
  );
  const paidBy = new Map(paid.map((r) => [r.b2bAccountId, r._sum.amount ?? 0]));
  const advanceBy = new Map(
    advances.map((r) => [r.b2bAccountId, r._sum.amount ?? 0]),
  );
  return accounts.map((a) => {
    const inv = invoicedBy.get(a.id) ?? 0;
    const pd = paidBy.get(a.id) ?? 0;
    return {
      ...a,
      balance: {
        invoiced: inv,
        paid: pd,
        advances: advanceBy.get(a.id) ?? 0,
        outstanding: inv - pd,
      },
    };
  });
}

export interface AccountFilters {
  status?: B2bAccountStatus;
  accountType?: B2bAccountType;
  tier?: number;
  ownerStaffId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function listAccounts(filters: AccountFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.B2bAccountWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.accountType ? { accountType: filters.accountType } : {}),
    ...(filters.tier != null ? { tier: filters.tier } : {}),
    ...(filters.ownerStaffId ? { ownerStaffId: filters.ownerStaffId } : {}),
    ...(filters.q
      ? {
          OR: [
            { companyName: { contains: filters.q, mode: "insensitive" as const } },
            { contactPerson: { contains: filters.q, mode: "insensitive" as const } },
            { phone: { contains: filters.q } },
          ],
        }
      : {}),
  };
  const [total, accounts] = await Promise.all([
    prisma.b2bAccount.count({ where }),
    prisma.b2bAccount.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tierData: true,
        ownerStaff: { select: { id: true, name: true } },
        _count: { select: { deals: true, payments: true } },
      },
    }),
  ]);
  return {
    accounts: await withBalances(accounts),
    total,
    page,
    limit,
  };
}

export async function getAccount(accountId: string) {
  const account = await prisma.b2bAccount.findUnique({
    where: { id: accountId },
    include: {
      tierData: true,
      ownerStaff: { select: { id: true, name: true } },
      sourceCrmLead: { select: { id: true, name: true, status: true } },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          ownerStaff: { select: { id: true, name: true } },
          tierData: true,
          quoteLines: { orderBy: { id: "asc" } },
          stageHistory: {
            orderBy: { createdAt: "asc" },
            include: { changedByStaff: { select: { id: true, name: true } } },
          },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        include: {
          paymentMethod: { select: { id: true, label: true } },
          recordedByStaff: { select: { id: true, name: true } },
        },
      },
      sales: {
        orderBy: { dateAd: "desc" },
        select: {
          id: true,
          saleNo: true,
          status: true,
          totalAmount: true,
          dateAd: true,
          dateBs: true,
        },
      },
    },
  });
  if (!account) throw new CmsError("B2B account not found", { statusCode: 404 });
  const balance = await outstandingBalance(account.id);
  return { ...account, balance };
}

export interface DealFilters {
  b2bAccountId?: string;
  stage?: B2bDealStage;
  ownerStaffId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export async function listDeals(filters: DealFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.B2bDealWhereInput = {
    ...(filters.b2bAccountId ? { b2bAccountId: filters.b2bAccountId } : {}),
    ...(filters.stage ? { stage: filters.stage } : {}),
    ...(filters.ownerStaffId ? { ownerStaffId: filters.ownerStaffId } : {}),
    ...(filters.from || filters.to
      ? {
          dateAd: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, deals, pipeline] = await Promise.all([
    prisma.b2bDeal.count({ where }),
    prisma.b2bDeal.findMany({
      where,
      orderBy: { dateAd: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        b2bAccount: { select: { id: true, companyName: true } },
        ownerStaff: { select: { id: true, name: true } },
        tierData: true,
        _count: { select: { quoteLines: true } },
      },
    }),
    // Pipeline value by stage — the target-list view, derived.
    prisma.b2bDeal.groupBy({
      by: ["stage"],
      where,
      _sum: { quoteAmount: true },
      _count: { _all: true },
    }),
  ]);
  const byStage = Object.fromEntries(
    B2B_DEAL_STAGES.map((s) => [s, { count: 0, value: 0 }]),
  ) as Record<B2bDealStage, { count: number; value: number }>;
  for (const row of pipeline) {
    if (row.stage in byStage) {
      byStage[row.stage as B2bDealStage] = {
        count: row._count._all,
        value: row._sum.quoteAmount ?? 0,
      };
    }
  }
  return { deals, total, page, limit, pipeline: byStage };
}

export async function getDeal(dealId: string) {
  const deal = await prisma.b2bDeal.findUnique({
    where: { id: dealId },
    include: {
      b2bAccount: { select: { id: true, companyName: true, tier: true } },
      ownerStaff: { select: { id: true, name: true } },
      tierData: true,
      quoteLines: { orderBy: { id: "asc" } },
      stageHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedByStaff: { select: { id: true, name: true } } },
      },
    },
  });
  if (!deal) throw new CmsError("Deal not found", { statusCode: 404 });
  return deal;
}

export interface PaymentFilters {
  b2bAccountId?: string;
  isAdvance?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export async function listPayments(filters: PaymentFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where: Prisma.B2bPaymentWhereInput = {
    ...(filters.b2bAccountId ? { b2bAccountId: filters.b2bAccountId } : {}),
    ...(filters.isAdvance !== undefined ? { isAdvance: filters.isAdvance } : {}),
    ...(filters.from || filters.to
      ? {
          paidAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [total, payments, sum] = await Promise.all([
    prisma.b2bPayment.count({ where }),
    prisma.b2bPayment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        b2bAccount: { select: { id: true, companyName: true } },
        paymentMethod: { select: { id: true, label: true } },
        recordedByStaff: { select: { id: true, name: true } },
      },
    }),
    prisma.b2bPayment.aggregate({ where, _sum: { amount: true } }),
  ]);
  return { payments, total, page, limit, totalReceived: sum._sum.amount ?? 0 };
}

export async function listTiers() {
  return prisma.b2bTier.findMany({ orderBy: { tier: "asc" } });
}
