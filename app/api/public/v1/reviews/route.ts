export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ReviewSubmitSchema } from "@/lib/validation/schemas";
import { getSiteModules } from "@/lib/site-modules";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

// Submit a review from the storefront. Always lands as unapproved — admins
// approve via /api/sysuser/reviews/[id]. Anonymous, so the same spam guards
// as member-leads (IP rate limit + "website" honeypot) plus a
// per-target/per-author/per-15min uniqueness window. A review targets one
// product (productId) or one service (serviceSlug).

const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (!(await getSiteModules()).reviews) {
    return NextResponse.json({ message: "Reviews are closed" }, { status: 404 });
  }
  if (!rateLimit(`review:${clientIp(req)}`, 5, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { message: "Too many requests — please try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = ReviewSubmitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid review", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Honeypot tripped — pretend success so bots learn nothing.
  if (d.website) {
    return NextResponse.json({ message: "ok", review: { pending: true } });
  }

  const target = d.productId
    ? await prisma.product.findFirst({
        where: { id: d.productId, status: "published" },
        select: { id: true },
      })
    : await prisma.service.findFirst({
        where: { slug: d.serviceSlug },
        select: { slug: true },
      });
  if (!target) {
    return NextResponse.json(
      { message: d.productId ? "Unknown product" : "Unknown service" },
      { status: 404 },
    );
  }

  // Coarse spam guard: same author + same target within 15 min = reject.
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await prisma.review.count({
    where: {
      productId: d.productId ?? null,
      serviceSlug: d.serviceSlug ?? null,
      authorName: d.authorName,
      createdAt: { gte: since },
    },
  });
  if (recent > 0) {
    return NextResponse.json(
      { message: "You just submitted a review — give us a moment to read it." },
      { status: 429 },
    );
  }

  const created = await prisma.review.create({
    data: {
      productId: d.productId ?? null,
      serviceSlug: d.serviceSlug ?? null,
      source: "website",
      rating: d.rating,
      title: d.title,
      body: d.body,
      authorName: d.authorName,
      authorEmail: d.authorEmail ?? null,
      isApproved: false,
    },
  });

  return NextResponse.json({
    message: "ok",
    review: {
      id: created.id,
      pending: true,
    },
  });
}
