export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { StaffReviewSchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const g = await requireRole("viewer");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "pending" | "approved" | "all"
  const productId = searchParams.get("productId") ?? undefined;
  const serviceSlug = searchParams.get("serviceSlug") ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? "25") || 25),
  );

  const where: Prisma.ReviewWhereInput = {};
  if (status === "pending") where.isApproved = false;
  else if (status === "approved") where.isApproved = true;
  if (productId) where.productId = productId;
  if (serviceSlug) where.serviceSlug = serviceSlug;

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        service: { select: { slug: true, name: true } },
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

/**
 * Staff-entered testimonial: feedback a customer gave on WhatsApp, Google, in
 * person… Saved as approved, with its source recorded so it is never mistaken
 * for a website submission.
 */
export async function POST(req: Request) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, StaffReviewSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const exists = d.productId
    ? await prisma.product.count({ where: { id: d.productId } })
    : await prisma.service.count({ where: { slug: d.serviceSlug } });
  if (!exists) {
    return NextResponse.json(
      { message: d.productId ? "Unknown product" : "Unknown service" },
      { status: 404 },
    );
  }

  const review = await prisma.review.create({
    data: {
      productId: d.productId ?? null,
      serviceSlug: d.serviceSlug ?? null,
      source: d.source,
      rating: d.rating,
      title: d.title,
      body: d.body,
      authorName: d.authorName,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: g.session.email,
    },
  });
  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Review",
    entityId: review.id,
    summary: `${review.rating}★ "${review.title}" (${d.source})`,
  });
  bumpTags(CACHE_TAGS.products, CACHE_TAGS.services);
  return NextResponse.json({ message: "ok", review }, { status: 201 });
}
