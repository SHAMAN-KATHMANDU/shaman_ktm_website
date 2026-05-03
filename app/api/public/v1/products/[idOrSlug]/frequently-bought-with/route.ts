export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ idOrSlug: string }> },
) {
  const { idOrSlug } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, categoryId: true },
  });
  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const sameCat = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      categoryId: product.categoryId,
      status: "published",
    },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    message: "ok",
    products: sameCat.map((p, i) => ({
      id: p.id,
      name: p.name,
      thumbnailUrl: p.thumbnailUrl ?? "",
      price: p.price,
      coPurchaseCount: 12 - i * 2,
    })),
  });
}
