import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ServiceSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

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
    },
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
  bumpTags(CACHE_TAGS.services);
  return NextResponse.json({ message: "ok" });
}
