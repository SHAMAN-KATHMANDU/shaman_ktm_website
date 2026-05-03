export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productSummaryFromRow } from "@/lib/api/server/dto";

export const revalidate = 60;

function intParam(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, intParam(searchParams.get("page"), 1));
  const limit = Math.min(100, Math.max(1, intParam(searchParams.get("limit"), 24)));

  const where = {
    status: "published",
    compareAtPrice: { not: null },
  } as const;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { variations: true },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    message: "ok",
    products: rows.map(productSummaryFromRow),
    total,
    page,
    limit,
    facets: null,
  });
}
