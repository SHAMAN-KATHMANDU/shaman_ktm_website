// MCP tools for the FAQ module. Writes go through lib/cms/faqs.ts — the same
// service the /api/sysuser/faqs routes use — then audit-log. CRU only: no
// delete tool by design (unpublish with published=false, or delete in the
// admin UI).

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FaqSchema, FAQ_TOPICS } from "@/lib/validation/schemas";
import { createFaq, getFaq, listFaqsAdmin, updateFaq } from "@/lib/cms/faqs";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

const PLACEMENT =
  "Placement: categoryId null → the question is on /pages/faq, under its topic heading; categoryId set → it shows on that category's page instead (call list_categories for ids). showOnHome=true also lists it in the home-page FAQ teaser (first 6 by position). Lower position sorts first.";

export function registerFaqTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_faqs",
    {
      title: "List FAQs",
      description: `List FAQ questions (id, question, questionNe, answer, answerNe, topic, categoryId + category, showOnHome, published, position), ordered by position. Optional filters: topic, categoryId ("none" = the /pages/faq set). ${PLACEMENT}`,
      inputSchema: {
        topic: z.enum(FAQ_TOPICS).optional(),
        categoryId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const faqs = (await listFaqsAdmin()).filter(
          (f) =>
            (!args.topic || f.topic === args.topic) &&
            (!args.categoryId ||
              (args.categoryId === "none" ? f.categoryId === null : f.categoryId === args.categoryId)),
        );
        return mcpJson({ faqs, topics: FAQ_TOPICS });
      } catch (err) {
        return mcpError(err, "list_faqs failed");
      }
    },
  );

  server.registerTool(
    "get_faq",
    {
      title: "Get FAQ",
      description: "Fetch one FAQ question by id (full payload). Call this before update_faq.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      try {
        requireMcpRole(ctx, "viewer");
        return mcpJson({ faq: await getFaq(id) });
      } catch (err) {
        return mcpError(err, "get_faq failed");
      }
    },
  );

  server.registerTool(
    "create_faq",
    {
      title: "Create FAQ",
      description: `Create an FAQ question. answer/answerNe are markdown (paragraphs, **bold**, [links](/contact), lists). topic is one of: ${FAQ_TOPICS.join(", ")}. published defaults to true. Only state facts the business has confirmed (prices, policies, hours). ${PLACEMENT}`,
      inputSchema: FaqSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const faq = await createFaq(FaqSchema.parse(args));
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Faq",
          entityId: faq.id,
          summary: faq.question,
        });
        return mcpJson({ faq });
      } catch (err) {
        return mcpError(err, "create_faq failed");
      }
    },
  );

  server.registerTool(
    "update_faq",
    {
      title: "Update FAQ",
      description:
        "Update an FAQ question by id with a FULL payload (same schema as create_faq). Call get_faq first and send every field back. To hide a question, set published=false. For Nepali-only edits, set_nepali_fields with entityType Faq is lighter.",
      inputSchema: { id: z.string(), ...FaqSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const faq = await updateFaq(id, FaqSchema.parse(rest));
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Faq",
          entityId: id,
          summary: faq.question,
        });
        return mcpJson({ faq });
      } catch (err) {
        return mcpError(err, "update_faq failed");
      }
    },
  );
}
