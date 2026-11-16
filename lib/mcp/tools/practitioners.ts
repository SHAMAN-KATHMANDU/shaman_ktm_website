// MCP tools for practitioners (who leads a service). Writes go through
// lib/cms/practitioners.ts — the same service the /api/sysuser/practitioners
// routes use — then audit-log. CRU only: no delete tool by design (hide with
// published=false, or delete in the admin UI).

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PractitionerSchema } from "@/lib/validation/schemas";
import {
  createPractitioner,
  getPractitioner,
  listPractitionersAdmin,
  updatePractitioner,
} from "@/lib/cms/practitioners";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

const PLACEMENT =
  "A practitioner shows on the page of every service in serviceSlugs (call list_services for slugs), ordered by position. bio and training are markdown. Set the photo with upload_media then set_entity_image target practitioner.photoUrl. Only state facts the person has confirmed (training, certifications, years).";

export function registerPractitionerTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_practitioners",
    {
      title: "List practitioners",
      description: `List practitioners (id, name, role, bio, training, photoUrl, published, position, services + Nepali fields). ${PLACEMENT}`,
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        return mcpJson({ practitioners: await listPractitionersAdmin() });
      } catch (err) {
        return mcpError(err, "list_practitioners failed");
      }
    },
  );

  server.registerTool(
    "get_practitioner",
    {
      title: "Get practitioner",
      description: "Fetch one practitioner by id (full payload). Call this before update_practitioner.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      try {
        requireMcpRole(ctx, "viewer");
        return mcpJson({ practitioner: await getPractitioner(id) });
      } catch (err) {
        return mcpError(err, "get_practitioner failed");
      }
    },
  );

  server.registerTool(
    "create_practitioner",
    {
      title: "Create practitioner",
      description: `Create a practitioner. published defaults to true. ${PLACEMENT}`,
      inputSchema: PractitionerSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const p = await createPractitioner(PractitionerSchema.parse(args));
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Practitioner",
          entityId: p.id,
          summary: p.name,
        });
        return mcpJson({ practitioner: p });
      } catch (err) {
        return mcpError(err, "create_practitioner failed");
      }
    },
  );

  server.registerTool(
    "update_practitioner",
    {
      title: "Update practitioner",
      description:
        "Update a practitioner by id with a FULL payload (same schema as create_practitioner, serviceSlugs replaces the links). Call get_practitioner first and send every field back. To hide someone, set published=false.",
      inputSchema: { id: z.string(), ...PractitionerSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const p = await updatePractitioner(id, PractitionerSchema.parse(rest));
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Practitioner",
          entityId: id,
          summary: p.name,
        });
        return mcpJson({ practitioner: p });
      } catch (err) {
        return mcpError(err, "update_practitioner failed");
      }
    },
  );
}
