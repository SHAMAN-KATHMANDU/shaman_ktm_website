export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 60;

function intParam(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ idOrSlug: string }> },
) {
  const { idOrSlug } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, intParam(searchParams.get("page"), 1));
  const limit = Math.min(50, Math.max(1, intParam(searchParams.get("limit"), 10)));

  const product = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { productId: product.id } }),
  ]);

  return NextResponse.json({
    message: "ok",
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.authorName,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  });
}
