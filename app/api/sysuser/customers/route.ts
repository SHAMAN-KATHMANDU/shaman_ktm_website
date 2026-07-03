export const dynamic = "force-dynamic";

// Admin customer list — searchable by email/name, paginated, with order
// counts. Read-only: customer records are created by the storefront.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";

const PAGE_SIZE_MAX = 100;

export async function GET(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || undefined;
  const pageRaw = Number(searchParams.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : 1;
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, PAGE_SIZE_MAX)
      : 25;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    message: "ok",
    customers: rows.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      orderCount: c._count.orders,
      lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  });
}
