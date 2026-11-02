export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { StockTransferSchema } from "@/lib/validation/schemas";
import { transferStock } from "@/lib/stock";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Showroom → showroom transfer: two ledger rows (−source, +destination)
// sharing a refId, applied atomically. Staff+ may move their own inventory.

export async function POST(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, StockTransferSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await prisma.staff.findUnique({
      where: { adminUserId: g.session.userId },
      select: { id: true },
    });
    const result = await transferStock({
      variationId: parsed.data.variationId,
      fromShowroomKey: parsed.data.fromShowroomKey,
      toShowroomKey: parsed.data.toShowroomKey,
      qty: parsed.data.qty,
      staffId: staff?.id,
      note: parsed.data.note ?? undefined,
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "StockMovement",
      entityId: result.refId,
      summary: `Transfer ${parsed.data.qty} of ${parsed.data.variationId}: ${parsed.data.fromShowroomKey} → ${parsed.data.toShowroomKey}`,
    });
    return NextResponse.json({ message: "ok", ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
