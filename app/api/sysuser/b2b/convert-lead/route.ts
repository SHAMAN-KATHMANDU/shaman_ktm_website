export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bLeadConvertSchema } from "@/lib/validation/schemas";
import { convertLeadToAccount } from "@/lib/b2b";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// A wholesale-interest lead becomes a trade account (spec decision #12). Both
// directions of the link are set in one transaction, and a lead can only be
// converted once.

export async function POST(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, B2bLeadConvertSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const a = parsed.data.account;
    const account = await convertLeadToAccount({
      crmLeadId: parsed.data.crmLeadId,
      createdByStaffId: staff.id,
      account: {
        companyName: a.companyName,
        contactPerson: a.contactPerson || null,
        phone: a.phone || null,
        email: a.email || null,
        address: a.address || null,
        panNo: a.panNo || null,
        accountType: a.accountType,
        tier: a.tier ?? null,
        status: a.status,
        ownerStaffId: a.ownerStaffId || null,
        showroomKey: a.showroomKey || null,
        notes: a.notes || null,
      },
    });
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "B2bAccount",
      entityId: account.id,
      summary: `Converted lead ${parsed.data.crmLeadId} → ${account.companyName}`,
    });
    return NextResponse.json({ message: "ok", account }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
