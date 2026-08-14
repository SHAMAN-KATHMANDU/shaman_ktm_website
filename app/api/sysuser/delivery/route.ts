export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { listDeliveryLog, countDeliveryEvents } from "@/lib/fulfilment";
import type { DeliveryEventName } from "@/lib/fulfilment/constants";

// The delivery log across all orders — the report surface. Counts come back
// alongside the rows so "12 delivered, 3 failed attempts" is a query rather
// than a hand tally.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filters = {
    courierId: searchParams.get("courierId") ?? undefined,
    staffId: searchParams.get("staffId") ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
  const event =
    (searchParams.get("event") as DeliveryEventName | null) ?? undefined;

  const [log, counts] = await Promise.all([
    listDeliveryLog({
      ...filters,
      event,
      page: Number(searchParams.get("page") ?? 1),
      limit: Number(searchParams.get("limit") ?? 100),
    }),
    // Counts deliberately ignore the event filter — the totals must span every
    // bucket or the tabs would each show their own number.
    countDeliveryEvents(filters),
  ]);

  return NextResponse.json({ message: "ok", ...log, counts });
}
