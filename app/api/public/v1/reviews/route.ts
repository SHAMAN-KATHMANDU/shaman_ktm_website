export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

// Submit a review from the storefront. Always lands as unapproved — admins
// approve via /api/sysuser/reviews/[id]. Rate-limited via the AdminLog
// audit table on email + IP wouldn't help here (no auth), so we use a
// per-product/per-email/per-15min uniqueness window.

const Body = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  authorName: z.string().min(1).max(80),
  authorEmail: z.string().email().optional(),
});

const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid review", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: d.productId },
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
