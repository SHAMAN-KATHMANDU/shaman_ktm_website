export const dynamic = "force-dynamic";

// Rename an OAuth connection. Every claude.ai connector self-reports the same
// client_name ("Claude"), so a nickname on the client row is what lets an admin
// tell two connections apart — and revoke the right one.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

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
