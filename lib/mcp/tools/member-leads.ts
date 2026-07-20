// MCP tools for Member Circle join requests (homepage opt-in form).
// Leads are created by the storefront only; MCP can list them and move them
// through the outreach workflow (new → contacted → activated / rejected).
// No delete surface, matching the rest of the MCP toolset.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

const LEAD_STATUSES = ["new", "contacted", "activated", "rejected"] as const;

export function registerMemberLeadTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_member_leads",
    {
      title: "List Member Circle leads",
      description:
        "List Member Circle join requests from the homepage form (name, WhatsApp, email, status, note), newest first. Filter by status: new | contacted | activated | rejected. Paginated (limit 1-100, default 25).",
      inputSchema: {
        status: z.enum(LEAD_STATUSES).optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const page = args.page ?? 1;
        const limit = args.limit ?? 25;
        const where = args.status ? { status: args.status } : {};
        const [rows, total] = await Promise.all([
          prisma.memberLead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.memberLead.count({ where }),
        ]);
        return mcpJson({
          leads: rows.map((l) => ({
            id: l.id,
            name: l.name,
            whatsapp: l.whatsapp,
            email: l.email,
            source: l.source,
            status: l.status,
            note: l.note,
            createdAt: l.createdAt.toISOString(),
            updatedAt: l.updatedAt.toISOString(),
          })),
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_member_leads failed");
      }
    },
  );

  server.registerTool(
    "update_member_lead_status",
    {
      title: "Update Member Circle lead status",
      description:
        "Move a Member Circle lead through the outreach workflow: new → contacted → activated (or rejected). Optionally set an admin note. Get ids from list_member_leads.",
      inputSchema: {
        id: z.string().min(1),
        status: z.enum(LEAD_STATUSES),
        note: z.string().max(2000).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const existing = await prisma.memberLead.findUnique({
          where: { id: args.id },
        });
        if (!existing) {
          throw new CmsError(
            "Member lead not found — call list_member_leads for ids.",
            { statusCode: 404 },
          );
        }
        const lead = await prisma.memberLead.update({
          where: { id: args.id },
          data: {
            status: args.status,
            note: args.note ?? undefined,
          },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "MemberLead",
          entityId: lead.id,
          summary: `status: ${lead.status}`,
        });
        return mcpJson({ lead });
      } catch (err) {
        return mcpError(err, "update_member_lead_status failed");
      }
    },
  );
}
