export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "pending" | "approved" | "all"
  const productId = searchParams.get("productId") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? "25") || 25),
  );

  const where: Prisma.ReviewWhereInput = {};
  if (status === "pending") where.isApproved = false;
  else if (status === "approved") where.isApproved = true;
  if (productId) where.productId = productId;

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({
    message: "ok",
    reviews: rows,
    meta: { total, page, pageSize },
  });
}
