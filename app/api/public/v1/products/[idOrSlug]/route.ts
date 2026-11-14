export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getProduct } from "@/lib/api/server/products";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ idOrSlug: string }> },
) {
  const { idOrSlug } = await ctx.params;
  const product = await getProduct(idOrSlug, localeFromRequest(req));
  if (!product) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", product });
}
