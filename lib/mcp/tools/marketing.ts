// MCP tools for marketing & footfall (reporting system, Module D).
//
// These are the last three of the twelve vault-sync tools, so with them the
// whole monthly report — CRM, sales, stock, B2B, footfall, social, ad spend —
// is answerable from records rather than from anyone's memory.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listFootfall, listSocialMetrics, listAdSpend } from "@/lib/marketing";
import {
  AD_PLATFORMS,
  FOOTFALL_SOURCES,
  SOCIAL_PLATFORMS,
  type AdPlatform,
  type FootfallSource,
  type SocialPlatform,
} from "@/lib/marketing/constants";
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

export function registerMarketingTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_footfall",
    {
      title: "List showroom footfall",
      description: `Footfall entries with their inquiries, plus derived period totals: visitorsTotal, convertedEntries, and conversionRate as a percentage. Sources: ${FOOTFALL_SOURCES.join(" | ")}. Each entry's inquiries record what visitors asked about — a catalog variation when it exists, otherwise the free-text name staff wrote down — with inquiryType "inquired" or "sold". A multi-product day is one entry with several inquiries, replacing the old continuation-row sheets. conversionRate is ENTRY-based, not visitor-based: a group of four is one entry and at most one conversion, so don't read it as a per-person rate. individuals and groups describe the composition of visitorsTotal and are not guaranteed to add up to it. Every row carries both calendars. Filter by showroomKey, source, convertedToSale, and a date range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        showroomKey: z.string().optional().describe("e.g. thamel | gongabu"),
        source: z.enum(FOOTFALL_SOURCES).optional(),
        convertedToSale: z.boolean().optional(),
        ...dateFilters,
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const r = await listFootfall({
          showroomKey: args.showroomKey,
          source: args.source as FootfallSource | undefined,
          convertedToSale: args.convertedToSale,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          footfall: r.entries.map((e) => ({
            id: e.id,
            dateAd: e.dateAd.toISOString(),
            dateBs: e.dateBs,
            showroomKey: e.showroomKey,
            showroom: e.showroom.name,
            visitorsTotal: e.visitorsTotal,
            individuals: e.individuals,
            groups: e.groups,
            source: e.source,
            convertedToSale: e.convertedToSale,
            linkedSaleId: e.linkedSaleId,
            enteredBy: e.enteredByStaff.name,
            enteredAt: e.enteredAt.toISOString(),
            notes: e.notes,
            inquiries: e.inquiries.map((q) => ({
              inquiryType: q.inquiryType,
              variationId: q.variationId,
              sku: q.variation?.sku ?? null,
              product: q.variation?.product.name ?? q.freeTextProduct,
              fromCatalog: !!q.variationId,
            })),
          })),
          visitorsTotal: r.visitorsTotal,
          convertedEntries: r.convertedEntries,
          conversionRate: r.conversionRate,
          total: r.total,
          page: r.page,
          limit: r.limit,
        });
      } catch (err) {
        return mcpError(err, "list_footfall failed");
      }
    },
  );

  server.registerTool(
    "list_social_metrics",
    {
      title: "List monthly social metrics",
      description: `Monthly social figures per platform (${SOCIAL_PLATFORMS.join(" | ")}) — followers, new followers, posts, stories, reels, reach, impressions, profile visits, average likes/comments/shares+saves, and engagement rate as a percentage with decimals preserved. Filed one row per Nepali month per platform (periodBs, e.g. "2083-04"), so re-filing a month corrects it rather than adding a second version. \`source\` says where the numbers came from: manual | api | csv_import. Filter by platform and a periodAd range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        platform: z.enum(SOCIAL_PLATFORMS).optional(),
        ...dateFilters,
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const r = await listSocialMetrics({
          platform: args.platform as SocialPlatform | undefined,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          metrics: r.metrics.map((m) => ({
            id: m.id,
            periodBs: m.periodBs,
            periodAd: m.periodAd.toISOString(),
            platform: m.platform,
            followers: m.followers,
            newFollowers: m.newFollowers,
            posts: m.posts,
            stories: m.stories,
            reels: m.reels,
            reach: m.reach,
            impressions: m.impressions,
            profileVisits: m.profileVisits,
            avgLikes: m.avgLikes,
            avgComments: m.avgComments,
            avgSharesSaves: m.avgSharesSaves,
            engagementRate: m.engagementRate,
            source: m.source,
            importedAt: m.importedAt.toISOString(),
          })),
          total: r.total,
          page: r.page,
          limit: r.limit,
        });
      } catch (err) {
        return mcpError(err, "list_social_metrics failed");
      }
    },
  );

  server.registerTool(
    "list_ad_spend",
    {
      title: "List daily ad spend",
      description: `Daily ad spend per platform (${AD_PLATFORMS.join(" | ")}) and campaign. IMPORTANT for reporting: the Meta export is denominated in AUD, so each row keeps \`amountSpent\` in its original \`currency\` alongside the \`fxRate\` used and the resulting \`amountNpr\`. Report in NPR using amountNpr — totals here sum only that column, because adding AUD to NPR would be meaningless. A row cannot exist without a positive fxRate, so an NPR figure is never silently a foreign-currency number. One row per (day, platform, campaign); a re-import corrects it. Also returns totalNpr, totalResults, a blended costPerResultNpr (null when nothing was attributed), and a byPlatform breakdown. Filter by platform and a date range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        platform: z.enum(AD_PLATFORMS).optional(),
        ...dateFilters,
        ...pageFilters,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const r = await listAdSpend({
          platform: args.platform as AdPlatform | undefined,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          adSpend: r.spend.map((s) => ({
            id: s.id,
            dateAd: s.dateAd.toISOString(),
            dateBs: s.dateBs,
            platform: s.platform,
            campaignName: s.campaignName,
            amountSpent: s.amountSpent,
            currency: s.currency,
            fxRate: s.fxRate,
            amountNpr: s.amountNpr,
            impressions: s.impressions,
            reach: s.reach,
            frequency: s.frequency,
            results: s.results,
            costPerResult: s.costPerResult,
            messagingConversations: s.messagingConversations,
            source: s.source,
            enteredBy: s.enteredByStaff?.name ?? null,
          })),
          totalNpr: r.totalNpr,
          totalResults: r.totalResults,
          costPerResultNpr: r.costPerResultNpr,
          byPlatform: r.byPlatform,
          total: r.total,
          page: r.page,
          limit: r.limit,
        });
      } catch (err) {
        return mcpError(err, "list_ad_spend failed");
      }
    },
  );
}
