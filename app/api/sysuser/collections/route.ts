export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { CollectionSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.collection.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ message: "ok", collections: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, CollectionSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  if (d.productIds && d.productIds.length > 0) {
    const found = await prisma.product.findMany({
      where: { id: { in: d.productIds } },
      select: { id: true },
    });
    const missing = d.productIds.filter(
      (pid) => !found.some((f) => f.id === pid),
    );
    if (missing.length > 0) {
      return NextResponse.json(
        {
          message: `Unknown product IDs: ${missing.join(", ")}`,
        },
        { status: 400 },
      );
    }
  }

  const slugClash = await prisma.collection.findUnique({
    where: { slug: d.slug },
    select: { id: true },
  });
  if (slugClash) {
    return NextResponse.json(
      { message: `A collection with slug "${d.slug}" already exists.` },
      { status: 409 },
    );
  }

  const row = await prisma.collection.create({
    data: {
      slug: d.slug,
      title: d.title,
      subtitle: d.subtitle ?? null,
      heroImageUrl: d.heroImageUrl ?? null,
      position: d.position,
      products: {
        create: (d.productIds ?? []).map((productId, idx) => ({
          productId,
          position: idx,
        })),
      },
    },
  });
  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Collection",
    entityId: row.id,
    summary: row.title,
  });
  bumpTags(CACHE_TAGS.collections);
  return NextResponse.json({ message: "ok", collection: row });
}
