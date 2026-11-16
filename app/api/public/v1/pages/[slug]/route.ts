export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPage } from "@/lib/api/server/pages";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const page = await getPage(slug, localeFromRequest(req));
  if (!page) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", page });
}
