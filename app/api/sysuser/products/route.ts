export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ProductSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { createProduct } from "@/lib/cms/products";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { searchParams } = new URL(req.url);
  const light = searchParams.get("light");
  const search = searchParams.get("q") || undefined;

  if (light === "1") {
    const rows = await prisma.product.findMany({
      orderBy: { name: "asc" },
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      select: {
        id: true,
        slug: true,
        name: true,
        thumbnailUrl: true,
        price: true,
        isFeatured: true,
        isNewRelease: true,
        elementSlugs: true,
        tags: true,
        status: true,
      },
    });
    return NextResponse.json({ message: "ok", products: rows });
  }

  const rows = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    include: { variations: true, images: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ message: "ok", products: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, ProductSchema);
  if (!parsed.ok) return parsed.response;

  let created;
  try {
    created = await createProduct(parsed.data, g.session.email);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }

  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Product",
    entityId: created.id,
    summary: created.name,
  });
  bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage);
  return NextResponse.json({ message: "ok", product: created });
}
