// Bearer-token auth for /api/mcp. Tokens are opaque (`smk_mcp_…`), shown once
// at creation; only the SHA-256 hex hash is stored (McpToken.tokenHash), so a
// DB leak doesn't leak usable credentials. Revocation = set revokedAt.

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { lowerRole, type AdminRole } from "@/lib/auth/roles";

export interface McpContext {
  tokenId: string;
  tokenName: string;
  role: AdminRole;
  /** Audit-log actor string, e.g. "mcp:claude-desktop". */
  actor: string;
}

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateMcpToken(): { token: string; tokenHash: string } {
  const token = `smk_mcp_${randomBytes(24).toString("base64url")}`;
  return { token, tokenHash: hashMcpToken(token) };
}

export async function verifyMcpToken(
  bearer: string,
): Promise<McpContext | null> {
  if (!bearer.startsWith("smk_mcp_")) return null;
  const row = await prisma.mcpToken.findUnique({
    where: { tokenHash: hashMcpToken(bearer) },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  // A token acts as the admin who approved/created it, so it can never do more
  // than that admin can do today, and dies with them. Legacy rows with no
  // creator id keep their stored role.
  let role = row.role as AdminRole;
  if (row.createdByUserId) {
    const creator = await prisma.adminUser.findUnique({
      where: { id: row.createdByUserId },
      select: { role: true },
    });
    if (!creator) return null;
    role = lowerRole(row.role, creator.role);
  }

  // Fire-and-forget usage stamp — same rationale as logAction().
  prisma.mcpToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    tokenId: row.id,
    tokenName: row.name,
    role,
    actor: `mcp:${row.name}`,
  };
}
