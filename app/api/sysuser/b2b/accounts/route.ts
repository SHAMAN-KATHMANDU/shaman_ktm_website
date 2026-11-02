export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bAccountSchema } from "@/lib/validation/schemas";
import { createAccount, listAccounts } from "@/lib/b2b";
import type { B2bAccountStatus, B2bAccountType } from "@/lib/b2b/constants";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Trade accounts. Each row in the list carries its outstanding balance, which
// nothing tracked before this module.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");

  const result = await listAccounts({
    status: (searchParams.get("status") as B2bAccountStatus | null) ?? undefined,
    accountType:
      (searchParams.get("accountType") as B2bAccountType | null) ?? undefined,
    tier: tier ? Number(tier) : undefined,
    ownerStaffId: searchParams.get("ownerStaffId") ?? undefined,
    q: searchParams.get("q")?.trim() || undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 100),
  });

  return NextResponse.json({ message: "ok", ...result });
}

export async function POST(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, B2bAccountSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const d = parsed.data;
    const account = await createAccount(
      {
        companyName: d.companyName,
        contactPerson: d.contactPerson || null,
        phone: d.phone || null,
        email: d.email || null,
        address: d.address || null,
        panNo: d.panNo || null,
        accountType: d.accountType,
        tier: d.tier ?? null,
        status: d.status,
        ownerStaffId: d.ownerStaffId || null,
        sourceCrmLeadId: d.sourceCrmLeadId || null,
        showroomKey: d.showroomKey || null,
        notes: d.notes || null,
      },
      staff.id,
    );
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "B2bAccount",
      entityId: account.id,
      summary: `${account.companyName} · ${account.accountType}${account.tier ? ` · tier ${account.tier}` : ""}`,
    });
    return NextResponse.json({ message: "ok", account }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
