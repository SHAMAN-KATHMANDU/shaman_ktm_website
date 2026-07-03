// MCP tools for managing Nepali translations across every content module —
// the translation workflow companion to the per-module CRU tools. Existing
// update_* tools require the FULL object; these tools let an agent audit
// which entities still lack Nepali and patch only the *Ne columns.
//
// The field allowlist lives in ./nepali-fields (pure, unit-tested against
// prisma/schema.prisma); this file binds it to prisma delegates.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bumpTags } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";
import {
  NE_FIELDS,
  type NeEntityType,
  type NeFieldEntry,
} from "./nepali-fields";

// Minimal structural view of a prisma delegate — lets one code path drive
// every model without a per-model switch. The concrete delegates are cast
// once below; safety comes from the NE_FIELDS allowlists.
interface NeDelegate {
  findMany(args: {
    where?: unknown;
    select?: Record<string, boolean>;
    orderBy?: unknown;
    skip?: number;
    take?: number;
  }): Promise<Record<string, unknown>[]>;
  count(args: { where?: unknown }): Promise<number>;
  update(args: {
    where: Record<string, string | number>;
    data: Record<string, string | null>;
  }): Promise<unknown>;
}

const DELEGATES: Record<NeEntityType, NeDelegate> = {
  Product: prisma.product as unknown as NeDelegate,
  Category: prisma.category as unknown as NeDelegate,
  Element: prisma.element as unknown as NeDelegate,
  Bundle: prisma.bundle as unknown as NeDelegate,
  Collection: prisma.collection as unknown as NeDelegate,
  BlogPost: prisma.blogPost as unknown as NeDelegate,
  BlogCategory: prisma.blogCategory as unknown as NeDelegate,
  Page: prisma.page as unknown as NeDelegate,
  Service: prisma.service as unknown as NeDelegate,
  Showroom: prisma.showroom as unknown as NeDelegate,
  Announcement: prisma.announcement as unknown as NeDelegate,
};

const ENTITY_TYPES = Object.keys(NE_FIELDS) as [
  NeEntityType,
  ...NeEntityType[],
];

/** where-clause matching rows whose Nepali is missing (null or ""). */
function missingWhere(fields: readonly string[]): unknown {
  return {
    OR: fields.flatMap((f) => [{ [f]: null }, { [f]: "" }]),
  };
}

export function registerNepaliTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_missing_nepali",
    {
      title: "List entities missing Nepali translations",
      description:
        "Audit Nepali (*Ne) coverage. Without entityType: returns per-module counts of rows with at least one missing Nepali field. With entityType: returns those rows (id, label, missingFields), paginated via page/limit. Follow up with set_nepali_fields to fill gaps. (SiteConfig home copy is audited via get_site_config; service whatToExpectNe and product image altNe go through their module's update_* tool.)",
      inputSchema: {
        entityType: z.enum(ENTITY_TYPES).optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");

        if (!args.entityType) {
          const summary = await Promise.all(
            ENTITY_TYPES.map(async (type) => ({
              entityType: type,
              fields: NE_FIELDS[type].fields,
              missingCount: await DELEGATES[type].count({
                where: missingWhere(NE_FIELDS[type].fields),
              }),
            })),
          );
          return mcpJson({
            summary,
            hint: "Call again with entityType to list the rows needing translation.",
          });
        }

        const e: NeFieldEntry = NE_FIELDS[args.entityType];
        const delegate = DELEGATES[args.entityType];
        const page = args.page ?? 1;
        const limit = args.limit ?? 25;
        const where = missingWhere(e.fields);
        const select: Record<string, boolean> = {
          [e.idField]: true,
          [e.labelField]: true,
        };
        for (const f of e.fields) select[f] = true;

        const [rows, total] = await Promise.all([
          delegate.findMany({
            where,
            select,
            orderBy: { [e.labelField]: "asc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          delegate.count({ where }),
        ]);

        const results = rows.map((row) => ({
          entityType: args.entityType,
          id: row[e.idField],
          label: row[e.labelField],
          missingFields: e.fields.filter((f) => !row[f]),
        }));

        return mcpJson({ results, total, page, limit });
      } catch (err) {
        return mcpError(err, "list_missing_nepali failed");
      }
    },
  );

  server.registerTool(
    "set_nepali_fields",
    {
      title: "Set Nepali fields on one entity",
      description:
        "Patch ONLY Nepali (*Ne) columns on a single entity — unlike update_* tools, no full payload needed. Pass entityType (see list_missing_nepali), the entity's id/slug/key, and a fields object such as { nameNe: \"…\" }. Set a field to null to clear it back to English fallback. Rejects field names the model doesn't have.",
      inputSchema: {
        entityType: z.enum(ENTITY_TYPES),
        id: z
          .string()
          .min(1)
          .describe(
            "Entity id, slug or key (Announcement ignores it — singleton)",
          ),
        fields: z
          .record(z.string(), z.string().nullable())
          .describe("Only *Ne field names allowed, e.g. { nameNe: '…' }"),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const e: NeFieldEntry = NE_FIELDS[args.entityType];

        const keys = Object.keys(args.fields);
        if (keys.length === 0) {
          throw new CmsError("Pass at least one Nepali field", {
            statusCode: 400,
            referenceKind: "NepaliField",
            availableOptions: [...e.fields],
          });
        }
        const unknown = keys.filter(
          (k) => !(e.fields as readonly string[]).includes(k),
        );
        if (unknown.length > 0) {
          throw new CmsError(
            `Unknown Nepali field(s) for ${args.entityType}: ${unknown.join(", ")}`,
            {
              statusCode: 400,
              referenceKind: "NepaliField",
              availableOptions: [...e.fields],
            },
          );
        }

        // Empty strings behave as "missing" on the storefront — store null.
        const data = Object.fromEntries(
          keys.map((k) => [k, args.fields[k] || null]),
        );
        const idValue = e.singleton ? 1 : args.id;

        let updated: unknown;
        try {
          updated = await DELEGATES[args.entityType].update({
            where: { [e.idField]: idValue },
            data,
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2025"
          ) {
            throw new CmsError(
              `${args.entityType} "${args.id}" not found — call list_missing_nepali or the module's list_* tool for valid ids.`,
              { statusCode: 404 },
            );
          }
          throw err;
        }

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: args.entityType,
          entityId: String(idValue),
          summary: `Nepali fields: ${keys.join(", ")}`,
        });
        bumpTags(...e.tags);

        return mcpJson({ [args.entityType.toLowerCase()]: updated });
      } catch (err) {
        return mcpError(err, "set_nepali_fields failed");
      }
    },
  );
}
