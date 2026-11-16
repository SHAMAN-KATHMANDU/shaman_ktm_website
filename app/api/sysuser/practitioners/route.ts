export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { PractitionerSchema } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { createPractitioner, listPractitionersAdmin } from "@/lib/cms/practitioners";

export async function GET() {
  const g = await requireRole("viewer");
  if (!g.ok) return g.response;
  const practitioners = await listPractitionersAdmin();
  return NextResponse.json({ message: "ok", practitioners });
}

export async function POST(req: Request) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, PractitionerSchema);
  if (!parsed.ok) return parsed.response;
  let practitioner;
  try {
    practitioner = await createPractitioner(parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Practitioner",
    entityId: practitioner.id,
    summary: practitioner.name,
  });
  return NextResponse.json({ message: "ok", practitioner });
}
