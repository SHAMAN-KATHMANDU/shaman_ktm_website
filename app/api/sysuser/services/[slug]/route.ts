export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ServiceSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  const parsed = await parseJson(req, ServiceSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const relatedSlugs = d.relatedProductSlugs ?? [];
  if (relatedSlugs.length > 0) {
    const found = await prisma.product.findMany({
      where: { slug: { in: relatedSlugs } },
      select: { slug: true },
    });
    const missing = relatedSlugs.filter(
      (s) => !found.some((f) => f.slug === s),
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Unknown related product slugs: ${missing.join(", ")}` },
        { status: 400 },
      );
    }
  }

  const row = await prisma.service.update({
    where: { slug },
    data: {
      slug: d.slug,
      name: d.name,
      element: d.element,
      duration: d.duration,
      pricePerSession: d.pricePerSession,
      hero: d.hero ?? null,
      summary: d.summary,
      whatToExpect: d.whatToExpect,
      relatedProductSlugs: d.relatedProductSlugs,
      position: d.position,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      ogImageUrl: d.ogImageUrl || null,
      canonicalUrl: d.canonicalUrl || null,
      noindex: d.noindex ?? false,
      twitterCard: d.twitterCard ?? "summary_large_image",
    },
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Service",
    entityId: row.slug,
    summary: row.name,
  });
  bumpTags(CACHE_TAGS.services);
  return NextResponse.json({ message: "ok", service: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  await prisma.service.delete({ where: { slug } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Service",
    entityId: slug,
  });
  bumpTags(CACHE_TAGS.services);
  return NextResponse.json({ message: "ok" });
}
