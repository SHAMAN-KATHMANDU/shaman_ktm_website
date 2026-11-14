export const dynamic = "force-dynamic";

// Rename (PATCH) or revoke (DELETE) an OAuth connection. Every claude.ai connector self-reports the same
// client_name ("Claude"), so a nickname on the client row is what lets an admin
// tell two connections apart — and revoke the right one.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { revokeFamily } from "@/lib/oauth/grants";

const RenameSchema = z.object({
  // Empty string clears the nickname and falls back to the self-reported name.
  label: z.string().max(60),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const parsed = await parseJson(req, RenameSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const client = await prisma.oAuthClient.findUnique({ where: { id } });
    if (!client) {
      throw new CmsError("Connection not found.", { statusCode: 404 });
    }

    const label = parsed.data.label.trim();
    const updated = await prisma.oAuthClient.update({
      where: { id },
      data: { label: label || null },
      select: { id: true, clientId: true, clientName: true, label: true },
    });

    logAction({
      actor: guard.session.email,
      action: "update",
      entity: "OAuthClient",
      entityId: id,
      summary: label ? `renamed to "${label}"` : "nickname cleared",
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    return NextResponse.json(
      { message: "Failed to rename connection" },
      { status: 500 },
    );
  }
}

// Revoke the whole connection: every grant family the client holds (refresh
// chains + their access tokens), and the client registration itself so it
// must register and be approved again. Works when no live access row exists.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  try {
    const client = await prisma.oAuthClient.findUnique({ where: { id } });
    if (!client) {
      throw new CmsError("Connection not found.", { statusCode: 404 });
    }

    const families = await prisma.oAuthRefreshToken.findMany({
      where: { clientId: id },
      select: { familyId: true },
      distinct: ["familyId"],
    });
    const reason = `connection revoked from the admin by ${guard.session.email}`;
    for (const f of families) await revokeFamily(f.familyId, reason);
    // Any access row of this client without a family dies with it too.
    await prisma.mcpToken.updateMany({
      where: { oauthClientId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!client.revokedAt) {
      await prisma.oAuthClient.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    }

    logAction({
      actor: guard.session.email,
      action: "update",
      entity: "OAuthClient",
      entityId: id,
      summary: `connection revoked (${families.length} grant(s))`,
    });

    return NextResponse.json({ message: "ok" });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    return NextResponse.json(
      { message: "Failed to revoke connection" },
      { status: 500 },
    );
  }
}
