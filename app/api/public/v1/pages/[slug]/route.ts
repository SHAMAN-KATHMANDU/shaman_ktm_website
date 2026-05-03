import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pageDetailFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const row = await prisma.page.findUnique({ where: { slug } });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(
    { message: "ok", page: pageDetailFromRow(row) },
    { headers: { "Cache-Tag": CACHE_TAGS.pages } },
  );
}
