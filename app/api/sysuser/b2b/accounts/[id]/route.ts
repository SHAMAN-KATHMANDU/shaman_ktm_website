export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bAccountSchema } from "@/lib/validation/schemas";
import { getAccount, updateAccount } from "@/lib/b2b";
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
    const account = await getAccount(id);
    return NextResponse.json({ message: "ok", account });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, B2bAccountSchema.partial());
  if (!parsed.ok) return parsed.response;

  try {
    const d = parsed.data;
    const account = await updateAccount(id, {
      ...(d.companyName !== undefined ? { companyName: d.companyName } : {}),
      ...(d.contactPerson !== undefined
        ? { contactPerson: d.contactPerson || null }
        : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.address !== undefined ? { address: d.address || null } : {}),
      ...(d.panNo !== undefined ? { panNo: d.panNo || null } : {}),
      ...(d.accountType !== undefined ? { accountType: d.accountType } : {}),
      ...(d.tier !== undefined ? { tier: d.tier ?? null } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.ownerStaffId !== undefined
        ? { ownerStaffId: d.ownerStaffId || null }
        : {}),
      ...(d.showroomKey !== undefined
        ? { showroomKey: d.showroomKey || null }
        : {}),
      ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "B2bAccount",
      entityId: account.id,
      summary: `${account.companyName} updated`,
    });
    return NextResponse.json({ message: "ok", account });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
