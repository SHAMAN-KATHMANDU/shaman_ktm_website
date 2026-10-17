export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { FaqSchema } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { deleteFaq, updateFaq } from "@/lib/cms/faqs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, FaqSchema);
  if (!parsed.ok) return parsed.response;
  let faq;
  try {
    faq = await updateFaq(id, parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Faq",
    entityId: id,
    summary: faq.question,
  });
  return NextResponse.json({ message: "ok", faq });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  try {
    await deleteFaq(id);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Faq",
    entityId: id,
  });
  return NextResponse.json({ message: "ok" });
}
