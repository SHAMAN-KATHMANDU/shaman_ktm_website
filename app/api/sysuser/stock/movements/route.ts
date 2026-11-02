export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { StockAdjustmentSchema } from "@/lib/validation/schemas";
import { getLedger, reconcileStockCount } from "@/lib/stock";
import { MOVEMENT_REASONS, type MovementReason } from "@/lib/stock/constants";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Append-only stock ledger. Reads are staff+; writes are editor-only and can
// only reconcile a pool to an absolute physical count — sale/order/transfer/
// correction movements are written by their own services, never here.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const reason = searchParams.get("reason");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (reason && !MOVEMENT_REASONS.includes(reason as MovementReason)) {
    return NextResponse.json(
      {
        message: `Unknown reason "${reason}"`,
        availableOptions: [...MOVEMENT_REASONS],
      },
      { status: 400 },
    );
  }

  const result = await getLedger({
    variationId: searchParams.get("variationId") ?? undefined,
    showroomKey: searchParams.get("showroomKey") ?? undefined,
    reason: (reason as MovementReason | null) ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 100),
  });

  return NextResponse.json({ message: "ok", ...result });
}

export async function POST(req: Request) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, StockAdjustmentSchema);
  if (!parsed.ok) return parsed.response;

  try {
    // Attribute the movement to the acting admin's Staff row when one is
    // linked; otherwise the ledger keeps the AdminLog trail only.
    const staff = await prisma.staff.findUnique({
      where: { adminUserId: g.session.userId },
      select: { id: true },
    });
    const movement = await reconcileStockCount({
      variationId: parsed.data.variationId,
      showroomKey: parsed.data.showroomKey,
      countedQty: parsed.data.countedQty,
      staffId: staff?.id,
      note: parsed.data.note ?? undefined,
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "StockMovement",
      entityId: movement.id,
      summary: `Count reconciled to ${parsed.data.countedQty} (${movement.delta > 0 ? "+" : ""}${movement.delta}) on ${movement.variationId} @ ${movement.showroomKey}`,
    });
    return NextResponse.json({ message: "ok", movement }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
