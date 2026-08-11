export const dynamic = "force-dynamic";

// Admin order list — filterable by status, paginated, newest first.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

const PAGE_SIZE_MAX = 100;

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const statusRaw = searchParams.get("status");
  const status = ORDER_STATUSES.includes(statusRaw as OrderStatus)
    ? (statusRaw as OrderStatus)
    : undefined;
  const search = searchParams.get("search")?.trim() || undefined;
  const pageRaw = Number(searchParams.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : 1;
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, PAGE_SIZE_MAX)
      : 25;

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              customer: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, email: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    message: "ok",
    orders: rows.map((o) => ({
      id: o.id,
      number: o.number,
      customer: o.customer,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.total,
      itemCount: o._count.items,
      deliveryZone: o.deliveryZone,
      createdAt: o.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  });
}
