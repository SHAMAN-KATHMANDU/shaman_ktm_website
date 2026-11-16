export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { PractitionerSchema } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { deletePractitioner, getPractitioner, updatePractitioner } from "@/lib/cms/practitioners";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("viewer");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ message: "ok", practitioner: await getPractitioner(id) });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, PractitionerSchema);
  if (!parsed.ok) return parsed.response;
  let practitioner;
  try {
    practitioner = await updatePractitioner(id, parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Practitioner",
    entityId: id,
    summary: practitioner.name,
  });
  return NextResponse.json({ message: "ok", practitioner });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  try {
    await deletePractitioner(id);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Practitioner",
    entityId: id,
  });
  return NextResponse.json({ message: "ok" });
}
