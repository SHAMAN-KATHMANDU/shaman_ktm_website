export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const mime = (searchParams.get("mime") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number(searchParams.get("pageSize") ?? "50") || 50),
  );

  const where: Prisma.MediaWhereInput = {};
  if (q) {
    where.OR = [
      { key: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
      { alt: { contains: q, mode: "insensitive" } },
    ];
  }
  if (mime) {
    where.mime = { startsWith: mime };
  }

  const [rows, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.media.count({ where }),
  ]);

  return NextResponse.json({
    message: "ok",
    media: rows,
    meta: { total, page, pageSize },
  });
}
