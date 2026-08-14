// MCP tools for B2B / wholesale (reporting system, Module C).
//
// Read-only. Outstanding balance and the dated stage pipeline are the two
// figures nothing tracked before this module, and both are derived here rather
// than maintained by hand in a spreadsheet.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listAccounts, listDeals, listPayments } from "@/lib/b2b";
import {
  B2B_ACCOUNT_STATUSES,
  B2B_ACCOUNT_TYPES,
  B2B_DEAL_STAGES,
  type B2bAccountStatus,
  type B2bAccountType,
  type B2bDealStage,
} from "@/lib/b2b/constants";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

const dateFilters = {
  from: z.string().datetime().optional().describe("ISO 8601 start, inclusive"),
  to: z.string().datetime().optional().describe("ISO 8601 end, inclusive"),
};

const pageFilters = {
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(500).optional(),
};

export function registerB2bTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_b2b_accounts",
    {
      title: "List B2B / wholesale accounts",
      description: `Trade accounts (${B2B_ACCOUNT_TYPES.join(" | ")}) with their tier and, for each one, a derived balance: invoiced (every non-draft sale booked to the account) minus everything received, plus the advances portion. A negative outstanding means the account is in credit, not an error. Statuses: ${B2B_ACCOUNT_STATUSES.join(" | ")}. Tiers carry the trade terms — tier 1 is 15% off MRP with 3% commission, tier 2 is 20%/5%, tier 3 is 25%/7%. Filter by status, accountType, tier, ownerStaffId, or a company/contact/phone search. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        status: z.enum(B2B_ACCOUNT_STATUSES).optional(),
        accountType: z.enum(B2B_ACCOUNT_TYPES).optional(),
        tier: z.number().int().min(1).max(3).optional(),
        ownerStaffId: z.string().optional(),
        q: z.string().optional().describe("Company, contact person, or phone"),
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const { accounts, total, page, limit } = await listAccounts({
          status: args.status as B2bAccountStatus | undefined,
          accountType: args.accountType as B2bAccountType | undefined,
          tier: args.tier,
          ownerStaffId: args.ownerStaffId,
          q: args.q,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          accounts: accounts.map((a) => ({
            id: a.id,
            companyName: a.companyName,
            contactPerson: a.contactPerson,
            phone: a.phone,
            email: a.email,
            address: a.address,
            panNo: a.panNo,
            accountType: a.accountType,
            status: a.status,
            tier: a.tier,
            tierTerms: a.tierData
              ? {
                  discountPct: a.tierData.discountPct,
                  targetMarginPct: a.tierData.targetMarginPct,
                  commissionPct: a.tierData.commissionPct,
                  minOrderValue: a.tierData.minOrderValue,
                  maxOrderValue: a.tierData.maxOrderValue,
                }
              : null,
            owner: a.ownerStaff?.name ?? null,
            sourceCrmLeadId: a.sourceCrmLeadId,
            showroomKey: a.showroomKey,
            dealCount: a._count.deals,
            paymentCount: a._count.payments,
            invoiced: a.balance.invoiced,
            paid: a.balance.paid,
            advances: a.balance.advances,
            outstanding: a.balance.outstanding,
            createdAt: a.createdAt.toISOString(),
          })),
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_b2b_accounts failed");
      }
    },
  );

  server.registerTool(
    "list_b2b_deals",
    {
      title: "List B2B deals",
      description: `Deals with a pipeline summary (count and quote value per stage) for the same filters. Stages, verbatim from the existing target list: ${B2B_DEAL_STAGES.join(" → ")} (won | lost | deferred are the outcomes). Stage history is append-only, so "samples sent on the 4th, quoted on the 9th" is recoverable per deal via the admin UI; this tool reports the current stage plus the derived pipeline. quoteAmount is computed from the deal's quote lines when they exist. Both calendars are on every row (dateAd, dateBs). Filter by account, stage, owner, and a dateAd range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        b2bAccountId: z.string().optional(),
        stage: z.enum(B2B_DEAL_STAGES).optional(),
        ownerStaffId: z.string().optional(),
        ...dateFilters,
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const { deals, total, page, limit, pipeline } = await listDeals({
          b2bAccountId: args.b2bAccountId,
          stage: args.stage as B2bDealStage | undefined,
          ownerStaffId: args.ownerStaffId,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          deals: deals.map((d) => ({
            id: d.id,
            dealName: d.dealName,
            stage: d.stage,
            account: d.b2bAccount.companyName,
            b2bAccountId: d.b2bAccountId,
            quoteAmount: d.quoteAmount,
            quoteLineCount: d._count.quoteLines,
            tierApplied: d.tierApplied,
            tierDiscountPct: d.tierData?.discountPct ?? null,
            expectedCloseDate: d.expectedCloseDate?.toISOString() ?? null,
            owner: d.ownerStaff?.name ?? null,
            linkedSaleId: d.linkedSaleId,
            dateAd: d.dateAd.toISOString(),
            dateBs: d.dateBs,
            notes: d.notes,
          })),
          pipeline,
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_b2b_deals failed");
      }
    },
  );

  server.registerTool(
    "list_b2b_payments",
    {
      title: "List B2B payments",
      description:
        "Money received from trade accounts, newest first, with the total for the same filters. `isAdvance` marks a payment taken before delivery — it still counts as money in hand, but is reported separately so a credit balance reads as credit. A negative amount is a refund. Every row carries both calendars (paidAt and dateBs) and the staff member who recorded it. Filter by account, advance-only, and a paidAt range. Paginated (limit 1-500, default 100).",
      inputSchema: {
        b2bAccountId: z.string().optional(),
        isAdvance: z.boolean().optional(),
        ...dateFilters,
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const { payments, total, page, limit, totalReceived } =
          await listPayments({
            b2bAccountId: args.b2bAccountId,
            isAdvance: args.isAdvance,
            from: args.from ? new Date(args.from) : undefined,
            to: args.to ? new Date(args.to) : undefined,
            page: args.page,
            limit: args.limit,
          });
        return mcpJson({
          payments: payments.map((p) => ({
            id: p.id,
            account: p.b2bAccount.companyName,
            b2bAccountId: p.b2bAccountId,
            saleId: p.saleId,
            amount: p.amount,
            isAdvance: p.isAdvance,
            paymentMethod: p.paymentMethod?.label ?? null,
            reference: p.reference,
            note: p.note,
            paidAt: p.paidAt.toISOString(),
            dateBs: p.dateBs,
            recordedBy: p.recordedByStaff.name,
          })),
          totalReceived,
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_b2b_payments failed");
      }
    },
  );
}
