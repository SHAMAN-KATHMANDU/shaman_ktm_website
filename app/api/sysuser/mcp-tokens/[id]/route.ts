export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

const RevokeMcpTokenSchema = z.object({
  revoke: z.boolean(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const parsed = await parseJson(req, RevokeMcpTokenSchema);
  if (!parsed.ok) return parsed.response;

  try {
    if (!parsed.data.revoke) {
      throw new CmsError("Only revoke=true is supported.", { statusCode: 400 });
    }

    const token = await prisma.mcpToken.findUnique({
      where: { id },
    });

    if (!token) {
      throw new CmsError("Token not found.", { statusCode: 404 });
    }

    // Idempotent: if already revoked, just return success
    if (token.revokedAt) {
      return NextResponse.json({
        id: token.id,
        name: token.name,
        revokedAt: token.revokedAt,
      });
    }

    const revoked = await prisma.mcpToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: {
        id: true,
        name: true,
        role: true,
        createdBy: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    logAction({
      actor: guard.session.email,
      action: "update",
      entity: "McpToken",
      entityId: id,
      summary: `${revoked.name} revoked`,
    });

    return NextResponse.json(revoked);
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    return NextResponse.json(
      { message: "Failed to revoke token" },
      { status: 500 },
    );
  }
}
