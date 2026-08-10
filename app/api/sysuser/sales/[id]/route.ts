export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { getSale, discardSaleDraft } from "@/lib/sales";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  try {
    const sale = await getSale(id);
    return NextResponse.json({ message: "ok", sale });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}

// Only a draft can be deleted — it never happened. A confirmed sale is
// immutable and must be voided instead, which appends a reversing sale.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  try {
    await discardSaleDraft(id);
    logAction({
      actor: g.session.email,
      action: "delete",
      entity: "Sale",
      entityId: id,
      summary: "discarded draft sale",
    });
    return NextResponse.json({ message: "ok" });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
