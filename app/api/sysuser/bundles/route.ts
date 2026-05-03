import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BundleSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.bundle.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { id: true, name: true, thumbnailUrl: true } },
        },
      },
    },
  });
  return NextResponse.json({ message: "ok", bundles: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, BundleSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const row = await prisma.bundle.create({
    data: {
      slug: d.slug,
      title: d.title,
      description: d.description ?? null,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      thumbnailUrl: d.thumbnailUrl ?? null,
      position: d.position,
      items: {
        create: (d.items ?? []).map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          position: it.position,
        })),
      },
    },
  });
  bumpTags(CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok", bundle: row });
}
