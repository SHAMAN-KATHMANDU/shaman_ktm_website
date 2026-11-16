export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

// Submit a review from the storefront. Always lands as unapproved — admins
// approve via /api/sysuser/reviews/[id]. Anonymous, so the same spam guards
// as member-leads (IP rate limit + "website" honeypot) plus a
// per-product/per-author/per-15min uniqueness window.

const Body = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  authorName: z.string().min(1).max(80),
  authorEmail: z.string().email().optional(),
  website: z.string().optional(), // honeypot: must stay empty
});

const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (!rateLimit(`review:${clientIp(req)}`, 5, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { message: "Too many requests — please try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
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

  const product = await prisma.product.findFirst({
    where: { id: d.productId, status: "published" },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json(
      { message: "Unknown product" },
      { status: 404 },
    );
  }

  // Coarse spam guard: same author + same product within 15 min = reject.
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await prisma.review.count({
    where: {
      productId: d.productId,
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
      productId: d.productId,
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
