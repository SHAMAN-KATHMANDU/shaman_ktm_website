export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bQuoteLinesSchema } from "@/lib/validation/schemas";
import { replaceQuoteLines } from "@/lib/b2b";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Replace a deal's quote lines. Callers send items, quantities and (optionally)
// a negotiated rate; discount, line totals and margin are computed server-side
// so a quote can't go out with arithmetic that doesn't hold.

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, B2bQuoteLinesSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const lines = await replaceQuoteLines({
      dealId: id,
      lines: parsed.data.lines.map((l) => ({
        productId: l.productId,
        variationId: l.variationId ?? null,
        qty: l.qty,
        wholesaleRate: l.wholesaleRate,
        note: l.note ?? null,
      })),
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "B2bDeal",
      entityId: id,
      summary: `quote replaced: ${lines.length} line${lines.length === 1 ? "" : "s"}`,
    });
    return NextResponse.json({ message: "ok", lines });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
