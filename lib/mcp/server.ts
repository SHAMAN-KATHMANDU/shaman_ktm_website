// Central MCP server factory. One stateless server is built per HTTP request
// (see app/api/mcp/route.ts) with the request's token context baked in. Tools
// live with their domain in lib/mcp/tools/*, prompts in lib/mcp/prompts/* —
// this file only registers them.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./auth";
import { registerProductTools } from "./tools/products";
import { registerCategoryTools } from "./tools/categories";
import { registerElementTools } from "./tools/elements";
import { registerBundleTools } from "./tools/bundles";
import { registerCollectionTools } from "./tools/collections";
import { registerBlogTools } from "./tools/blog";
import { registerPageTools } from "./tools/pages";
import { registerServiceTools } from "./tools/services";
import { registerReviewTools } from "./tools/reviews";
import { registerMediaTools } from "./tools/media";
import { registerRedirectTools } from "./tools/redirects";
import { registerShowroomTools } from "./tools/showrooms";
import { registerSiteConfigTools } from "./tools/site";
import { registerActivityTools } from "./tools/activity";
import { registerNepaliTools } from "./tools/nepali";
import { registerOrderTools } from "./tools/orders";
import { registerCustomerTools } from "./tools/customers";
import { registerMemberLeadTools } from "./tools/member-leads";
import { registerStockTools } from "./tools/stock";
import { registerCrmTools } from "./tools/crm";
import { registerProductListingPrompt } from "./prompts/product-listing";

const MCP_INSTRUCTIONS = `Shaman Kathmandu CMS — Create/Read/Update tools for every content module (products, bundles, collections, blog, pages, services, media, site config, …). There are deliberately NO delete tools; deletions happen in the admin UI only.

Protocol:
- Before referencing another entity (categoryId, productId(s), categorySlug, relatedProductSlugs, element slugs), call the matching list_* tool and use a returned id/slug. If a reference is rejected, the error includes availableOptions — pick from it or ask the user.
- Updates take the FULL object (same schema as create): call the matching get_* tool first, modify the fields you need, and send everything back.
- Prices are integers in whole NPR rupees: NPR 4,500 → 4500.
- Slugs are lower-kebab-case and must be unique per entity.
- Media uploads are two-phase: sign_media_upload returns {uploadUrl, key} → HTTP PUT the file bytes to uploadUrl → confirm_media_upload with the key creates the library record. Reference images by their public URL afterwards.
- Blog/homepage video embeds accept YouTube/Vimeo URLs only.
- Product/blog "status" controls visibility (draft|published|archived) — prefer creating drafts unless the user asks to publish.
- Every write is audit-logged with this token's name as actor.
- Bilingual (EN+Nepali): Every translatable field has an optional Nepali twin (e.g. nameNe, descriptionNe, bodyMarkdownNe, seoTitleNe, seoDescriptionNe). Omitting the Nepali field makes the storefront fall back to English (ne || en). The *Ne fields are optional and nullable, so English-only payloads continue to work unchanged.
- Nepali translation workflow: call list_missing_nepali (no args) for a coverage summary, then per entityType for the rows, then set_nepali_fields to patch ONLY the *Ne columns — no full payload needed.
- Orders: created by storefront checkout only — MCP exposes list_orders / get_order / update_order_status (pending → confirmed → shipped → delivered, cancellable until shipped; cancelling restores stock and every change emails the customer). Customers are read-only (list_customers / get_customer).
- Member Circle leads: homepage join-form submissions — list_member_leads / update_member_lead_status (new → contacted → activated | rejected); created by the storefront only.
- When asked to list/add new products (especially from photos), call get_product_listing_workflow first and follow that SOP exactly.

Reporting system (read-only vault contract):
- CRM leads: list_crm_leads / get_crm_lead. A period's figures (e.g. "new 10, warm 3") come back as derived counts — never ask a human for a tally. Status history is append-only and dated, so get_crm_lead shows exactly how a lead moved and who moved it. A lead's interest (retail | wholesale_b2b | custom_order) is separate from its source (SMS, WhatsApp, Instagram DM, Walk-in, …).
- Stock is tracked per (product variation × showroom) — pools are separate, so a variation can exist in one showroom and not another. list_stock returns current balances; list_stock_movements returns the append-only ledger. Both are viewer-role, date-range filterable, and paginated (limit 1-500, default 100).
- Stock is never written through MCP. Balances change only via confirmed sales, order fulfilment, transfers, or an admin adjustment in /sysuser/stock, so every movement keeps staff attribution. A mistake is corrected by a new reversing row, never an edit.
- Product wholesale fields (wholesalePrice, moq, legacyImsCode, qrPayload) and variation costPrice/wholesalePrice are admin/MCP-only — they are never rendered on public pages, feeds, or JSON-LD. moq is the one wholesale field shown publicly, in the /wholesale section.`;

export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: "shamanktm-cms", version: "1.0.0" },
    { instructions: MCP_INSTRUCTIONS },
  );

  registerProductTools(server, ctx);
  registerCategoryTools(server, ctx);
  registerElementTools(server, ctx);
  registerBundleTools(server, ctx);
  registerCollectionTools(server, ctx);
  registerBlogTools(server, ctx);
  registerPageTools(server, ctx);
  registerServiceTools(server, ctx);
  registerReviewTools(server, ctx);
  registerMediaTools(server, ctx);
  registerRedirectTools(server, ctx);
  registerShowroomTools(server, ctx);
  registerSiteConfigTools(server, ctx);
  registerActivityTools(server, ctx);
  registerNepaliTools(server, ctx);
  registerOrderTools(server, ctx);
  registerCustomerTools(server, ctx);
  registerMemberLeadTools(server, ctx);
  registerStockTools(server, ctx);
  registerCrmTools(server, ctx);

  registerProductListingPrompt(server);

  return server;
}
