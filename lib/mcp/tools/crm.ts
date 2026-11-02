// MCP tools for CRM leads (reporting system, Module A).
//
// Read-only: the vault pulls these for monthly reports and never writes back.
// Leads are recorded through the admin UI or the leads bot so every row keeps a
// server timestamp and an author.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLead, listLeads, countLeadsByStatus } from "@/lib/crm";
import {
  LEAD_INTERESTS,
  LEAD_STATUSES,
  type LeadInterest,
  type LeadStatus,
} from "@/lib/crm/constants";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

const dateFilters = {
  from: z
    .string()
    .datetime()
    .optional()
    .describe("ISO 8601 start of createdAt range, inclusive"),
  to: z
    .string()
    .datetime()
    .optional()
    .describe("ISO 8601 end of createdAt range, inclusive"),
};

export function registerCrmTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_crm_leads",
    {
      title: "List CRM leads",
      description: `CRM leads, newest first, with per-status counts for the same filters (minus status) so a period's figures are derived rather than typed. Statuses: ${LEAD_STATUSES.join(" | ")} — hot = actively talking, warm = conversation started but not finalised, cold = no reply, purchase = converted, dnc = do not contact, new = untriaged intake. \`interest\` (${LEAD_INTERESTS.join(" | ")}) is how they want to buy and is separate from \`source\` (how they reached us). Filter by status, interest, sourceId, showroomKey, assignedStaffId, a name/phone search, and a createdAt range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        status: z.enum(LEAD_STATUSES).optional(),
        interest: z.enum(LEAD_INTERESTS).optional(),
        sourceId: z.string().optional(),
        showroomKey: z.string().optional().describe("e.g. thamel | gongabu"),
        assignedStaffId: z.string().optional(),
        q: z.string().optional().describe("Case-insensitive name or phone match"),
        ...dateFilters,
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const filters = {
          interest: args.interest as LeadInterest | undefined,
          sourceId: args.sourceId,
          showroomKey: args.showroomKey,
          assignedStaffId: args.assignedStaffId,
          q: args.q,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
        };
        const [{ leads, total, page, limit }, counts] = await Promise.all([
          listLeads({
            ...filters,
            status: args.status as LeadStatus | undefined,
            page: args.page,
            limit: args.limit,
          }),
          countLeadsByStatus(filters),
        ]);
        return mcpJson({
          leads: leads.map((l) => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            phoneAlt: l.phoneAlt,
            email: l.email,
            source: l.source.label,
            sourceId: l.sourceId,
            interest: l.interest,
            status: l.status,
            askedLocation: l.askedLocation,
            willVisit: l.willVisit,
            visitDate: l.visitDate?.toISOString() ?? null,
            followUpDate: l.followUpDate?.toISOString() ?? null,
            showroomKey: l.showroomKey,
            assignedStaff: l.assignedStaff?.name ?? null,
            createdByStaff: l.createdByStaff?.name ?? null, // null = submitted from the website, not written down by anyone
            linkedSaleId: l.linkedSaleId,
            linkedB2bAccountId: l.linkedB2bAccountId,
            followupCount: l._count.followups,
            evidenceUrl: l.evidenceUrl,
            notes: l.notes,
            createdAt: l.createdAt.toISOString(),
          })),
          counts,
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_crm_leads failed");
      }
    },
  );

  server.registerTool(
    "get_crm_lead",
    {
      title: "Get CRM lead",
      description:
        "One lead with its full append-only status history (oldest first — the row with fromStatus null is the lead's creation) and every logged follow-up (channel, whether the customer replied). Statuses are never overwritten in place, so this history is the authoritative record of how the lead moved. Get ids from list_crm_leads.",
      inputSchema: { id: z.string().min(1) },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const l = await getLead(args.id);
        return mcpJson({
          lead: {
            id: l.id,
            name: l.name,
            phone: l.phone,
            phoneAlt: l.phoneAlt,
            email: l.email,
            source: l.source.label,
            sourceId: l.sourceId,
            interest: l.interest,
            status: l.status,
            askedLocation: l.askedLocation,
            willVisit: l.willVisit,
            visitDate: l.visitDate?.toISOString() ?? null,
            followUpDate: l.followUpDate?.toISOString() ?? null,
            showroomKey: l.showroomKey,
            assignedStaff: l.assignedStaff?.name ?? null,
            createdByStaff: l.createdByStaff?.name ?? null, // null = submitted from the website, not written down by anyone
            linkedSaleId: l.linkedSaleId,
            linkedB2bAccountId: l.linkedB2bAccountId,
            evidenceUrl: l.evidenceUrl,
            notes: l.notes,
            createdAt: l.createdAt.toISOString(),
            statusHistory: l.statusHistory.map((h) => ({
              fromStatus: h.fromStatus,
              toStatus: h.toStatus,
              changedBy: h.changedByStaff?.name ?? null,
              note: h.note,
              at: h.createdAt.toISOString(),
            })),
            followups: l.followups.map((f) => ({
              id: f.id,
              channel: f.channel,
              gotResponse: f.gotResponse,
              notes: f.notes,
              followupAt: f.followupAt.toISOString(),
              staff: f.staff.name,
            })),
          },
        });
      } catch (err) {
        return mcpError(err, "get_crm_lead failed");
      }
    },
  );
}
