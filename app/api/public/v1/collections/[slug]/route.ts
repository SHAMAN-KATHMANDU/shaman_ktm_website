export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCollection } from "@/lib/api/server/collections";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const limit = parseInt(new URL(req.url).searchParams.get("limit") ?? "24", 10);
  const collection = await getCollection(slug, localeFromRequest(req), limit);
  if (!collection) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", collection });
}
