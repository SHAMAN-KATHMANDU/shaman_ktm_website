export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBundle } from "@/lib/api/server/bundles";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const bundle = await getBundle(slug, localeFromRequest(req));
  if (!bundle) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", bundle });
}
