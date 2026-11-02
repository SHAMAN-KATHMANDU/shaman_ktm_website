export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { FootfallInquirySchema } from "@/lib/validation/schemas";
import { addFootfallInquiry } from "@/lib/marketing";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Add an inquiry to an existing entry — the case the old sheets handled by
// spilling onto a blank-date continuation row.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, FootfallInquirySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const inquiry = await addFootfallInquiry({
      footfallEntryId: id,
      inquiry: {
        variationId: parsed.data.variationId ?? null,
        freeTextProduct: parsed.data.freeTextProduct ?? null,
        inquiryType: parsed.data.inquiryType,
      },
    });
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "FootfallInquiry",
      entityId: inquiry.id,
      summary: `${inquiry.inquiryType} on entry ${id}`,
    });
    return NextResponse.json({ message: "ok", inquiry }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
