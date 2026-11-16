export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBlogPost } from "@/lib/api/server/blog";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const data = await getBlogPost(slug, localeFromRequest(req));
  if (!data) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", ...data });
}
