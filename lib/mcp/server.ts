// Central MCP server factory. One stateless server is built per HTTP request
// (see app/api/mcp/route.ts) with the request's token context baked in. Tools
// live with their domain in lib/mcp/tools/* — this file only registers them.

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

const MCP_INSTRUCTIONS = `Shaman Kathmandu CMS — Create/Read/Update tools for every content module (products, bundles, collections, blog, pages, services, media, site config, …). There are deliberately NO delete tools; deletions happen in the admin UI only.

Protocol:
- Before referencing another entity (categoryId, productId(s), categorySlug, relatedProductSlugs, element slugs), call the matching list_* tool and use a returned id/slug. If a reference is rejected, the error includes availableOptions — pick from it or ask the user.
- Updates take the FULL object (same schema as create): call the matching get_* tool first, modify the fields you need, and send everything back.
- Prices are integers in NPR paisa (1/100 NPR): NPR 4,500 → 450000.
- Slugs are lower-kebab-case and must be unique per entity.
- Media uploads are two-phase: sign_media_upload returns {uploadUrl, key} → HTTP PUT the file bytes to uploadUrl → confirm_media_upload with the key creates the library record. Reference images by their public URL afterwards.
- Blog/homepage video embeds accept YouTube/Vimeo URLs only.
- Product/blog "status" controls visibility (draft|published|archived) — prefer creating drafts unless the user asks to publish.
- Every write is audit-logged with this token's name as actor.`;

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

  return server;
}
