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
import { registerSalesTools } from "./tools/sales";
import { registerB2bTools } from "./tools/b2b";
import { registerMarketingTools } from "./tools/marketing";
import { registerDeliveryTools } from "./tools/delivery";
import { registerProductListingPrompt } from "./prompts/product-listing";

const MCP_INSTRUCTIONS = `Shaman Kathmandu CMS — Create/Read/Update tools for every content module (products, bundles, collections, blog, pages, services, media, site config, …). There are deliberately NO delete tools; deletions happen in the admin UI only.

Protocol:
- Before referencing another entity (categoryId, productId(s), categorySlug, relatedProductSlugs, element slugs), call the matching list_* tool and use a returned id/slug. If a reference is rejected, the error includes availableOptions — pick from it or ask the user.
- Updates take the FULL object (same schema as create): call the matching get_* tool first, modify the fields you need, and send everything back.
- Prices are integers in whole NPR rupees: NPR 4,500 → 4500.
- Slugs are lower-kebab-case and must be unique per entity.
- Media: upload_media stores a photo/video in ONE call from a public https link (sourceUrl — Google Drive "anyone with the link" works) or base64 bytes (from agents holding the file, e.g. Telegram bots) and returns media.url. Then attach without a full-payload update: add_product_images / remove_product_image / reorder_product_images for product galleries, set_entity_image for single fields (category.imageUrl, collection.heroImageUrl, blogPost.heroImageUrl, bundle.thumbnailUrl, product.thumbnailUrl, …). The two-phase sign_media_upload → HTTP PUT → confirm_media_upload flow remains for HTTP-capable clients and large files. Always list_media first to avoid re-uploading.
- Blog/homepage video embeds accept YouTube/Vimeo URLs only.
- Product/blog "status" controls visibility (draft|published|archived) — prefer creating drafts unless the user asks to publish.
- Every write is audit-logged with this token's name as actor.
- Bilingual (EN+Nepali): Every translatable field has an optional Nepali twin (e.g. nameNe, descriptionNe, bodyMarkdownNe, seoTitleNe, seoDescriptionNe). Omitting the Nepali field makes the storefront fall back to English (ne || en). The *Ne fields are optional and nullable, so English-only payloads continue to work unchanged.
- Nepali translation workflow: call list_missing_nepali (no args) for a coverage summary, then per entityType for the rows, then set_nepali_fields to patch ONLY the *Ne columns — no full payload needed.
- Orders: created by storefront checkout only — MCP exposes list_orders / get_order / update_order_status (pending → confirmed → shipped → delivered, cancellable until shipped; cancelling restores stock and every change emails the customer). Customers are read-only (list_customers / get_customer).
- Member Circle leads: homepage join-form submissions — list_member_leads / update_member_lead_status (new → contacted → activated | rejected); created by the storefront only.
- When asked to list/add new products (especially from photos), call get_product_listing_workflow first and follow that SOP exactly.

Reporting system (read-only vault contract — all thirteen tools):
- CRM leads: list_crm_leads / get_crm_lead. A period's figures (e.g. "new 10, warm 3") come back as derived counts — never ask a human for a tally. Status history is append-only and dated, so get_crm_lead shows exactly how a lead moved and who moved it. A lead's interest (retail | wholesale_b2b | custom_order) is separate from its source (SMS, WhatsApp, Instagram DM, Walk-in, …).
- Sales: list_sales / get_sale. ONE spine for every channel — online, showroom, wholesale_b2b, event — so the separate sales reports are filters (channel + showroomKey + date range), not separate systems. draft holds no stock and isn't counted; confirming decrements one showroom's pool and makes the sale immutable; a correction is a NEW reversing sale (negated amounts), never an edit. netRevenue therefore keeps a closed month's figure stable and puts the correction in the month it was made.
- B2B / wholesale: list_b2b_accounts / list_b2b_deals / list_b2b_payments. Accounts carry a derived balance — invoiced (non-draft sales booked to the account) minus everything received — which nothing tracked before; a negative outstanding means the account is in credit. Deals report a pipeline summary by stage; quote totals are computed from quote lines, and quote margin comes from catalog cost, never typed. Tier terms: 1 = 15% off / 3% commission, 2 = 20% / 5%, 3 = 25% / 7%.
- Marketing: list_footfall / list_social_metrics / list_ad_spend. Footfall returns derived visitor totals and an ENTRY-based conversion rate (a group of four is one entry), with each entry's inquiries naming a catalog variation or the free text staff wrote. Social metrics are one row per Nepali month per platform. Ad spend keeps the original amount and currency (the Meta export is AUD) beside the fxRate and the resulting amountNpr — always report in NPR using amountNpr; a row cannot exist without a positive rate.
- Delivery log: list_delivery_log. The append-only physical journey of a parcel — packed, dispatched, out_for_delivery, failed_attempt, delivered, returned, exchanged — with the courier, the staff member, and the cash collected at the door. It returns per-event counts for the period alongside the rows, so "12 delivered, 3 failed attempts" is one call. Distinct from an order's customer-facing status: recording a dispatch moves that status automatically, so the two never disagree. Corrections are new events, never edits.
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
  registerSalesTools(server, ctx);
  registerB2bTools(server, ctx);
  registerMarketingTools(server, ctx);
  registerDeliveryTools(server, ctx);

  registerProductListingPrompt(server);

  return server;
}
