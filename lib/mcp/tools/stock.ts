// MCP tools for the per-showroom stock ledger (reporting system).
//
// Read-only by design: these are the vault-sync contract for monthly reports.
// Stock is never written through MCP — movements come from confirmed sales,
// order fulfilment, transfers, or an admin physical-count reconciliation in /sysuser/stock, so
// that every change carries staff attribution and an append-only trail.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLedger, getStockLevels } from "@/lib/stock";
import { MOVEMENT_REASONS } from "@/lib/stock/constants";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

const dateFilters = {
  from: z
    .string()
    .datetime()
    .optional()
    .describe("ISO 8601 start of range, inclusive (e.g. 2026-08-01T00:00:00Z)"),
  to: z
    .string()
    .datetime()
    .optional()
    .describe("ISO 8601 end of range, inclusive"),
};

const pageFilters = {
  page: z.number().int().min(1).optional().describe("1-indexed page, default 1"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Rows per page, default 100, max 500"),
};

export function registerStockTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_stock",
    {
      title: "List stock levels per showroom",
      description:
        "Current stock balance for each (product variation × inventory pool). The reserved `online` pool is what checkout can honour; physical showroom pools such as thamel or gongabu are not online-sellable. Quantities are materialized from the append-only movement ledger. Filter by showroomKey or variationId. Paginated (limit 1-500, default 100).",
      inputSchema: {
        showroomKey: z
          .string()
          .optional()
          .describe("Inventory pool key, e.g. online | thamel | gongabu"),
        variationId: z.string().optional(),
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const { levels, total, page, limit } = await getStockLevels({
          showroomKey: args.showroomKey,
          variationId: args.variationId,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          stock: levels.map((l) => ({
            variationId: l.variationId,
            sku: l.variation.sku,
            variationLabel: l.variation.label,
            productName: l.variation.product.name,
            productSlug: l.variation.product.slug,
            showroomKey: l.showroomKey,
            qty: l.qty,
            updatedAt: l.updatedAt.toISOString(),
          })),
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_stock failed");
      }
    },
  );

  server.registerTool(
    "list_stock_movements",
    {
      title: "List stock movements (append-only ledger)",
      description: `Append-only stock ledger, newest first. Every row is one delta against one showroom's pool: positive = stock in, negative = stock out. Reasons: ${MOVEMENT_REASONS.join(" | ")}. Corrections are new reversing rows (reason "correction", refType "StockMovement", refId = the corrected row) — history is never edited. Filter by variationId, showroomKey, reason, and a from/to date range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        variationId: z.string().optional(),
        showroomKey: z
          .string()
          .optional()
          .describe("Showroom key, e.g. thamel | gongabu"),
        reason: z.enum(MOVEMENT_REASONS).optional(),
        ...dateFilters,
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const { movements, total, page, limit } = await getLedger({
          variationId: args.variationId,
          showroomKey: args.showroomKey,
          reason: args.reason,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          movements: movements.map((m) => ({
            id: m.id,
            variationId: m.variationId,
            sku: m.variation.sku,
            variationLabel: m.variation.label,
            productName: m.variation.product.name,
            showroomKey: m.showroomKey,
            delta: m.delta,
            reason: m.reason,
            refType: m.refType,
            refId: m.refId,
            staffId: m.staffId,
            staffName: m.staff?.name ?? null,
            note: m.note,
            createdAt: m.createdAt.toISOString(),
          })),
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_stock_movements failed");
      }
    },
  );
}
