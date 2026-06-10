// Response/error helpers shared by every MCP tool handler. Errors are
// AI-actionable: CmsError reference failures carry `availableOptions` so the
// calling agent can self-correct (pick a valid id/slug) instead of guessing.

import { ZodError } from "zod";
import type { AdminRole } from "@/lib/auth/guard";
import { CmsError } from "@/lib/cms/errors";
import type { McpContext } from "./auth";

export interface McpToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export function mcpJson(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function mcpError(err: unknown, fallback: string): McpToolResult {
  const body: Record<string, unknown> = { error: fallback, statusCode: 500 };
  if (err instanceof CmsError) {
    body.error = err.message;
    body.statusCode = err.statusCode;
    if (err.referenceKind) body.referenceKind = err.referenceKind;
    if (err.availableOptions) {
      body.availableOptions = err.availableOptions;
      body.hint =
        "Pick one of availableOptions (use the matching list_* tool to see details), or confirm with the user before creating a new one.";
    }
  } else if (err instanceof ZodError) {
    body.error = "Validation failed";
    body.statusCode = 400;
    body.issues = err.flatten();
  } else if (err instanceof Error) {
    body.error = err.message || fallback;
  }
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(body) }],
  };
}

const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

/** Throws a 403 CmsError when the token's role is below `min`. */
export function requireMcpRole(ctx: McpContext, min: AdminRole): void {
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) {
    throw new CmsError(
      `Forbidden — this token has role "${ctx.role}" but the tool requires "${min}".`,
      { statusCode: 403 },
    );
  }
}
