export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRelatedProducts } from "@/lib/api/server/products";
import { localeFromRequest } from "@/lib/i18n/locale";

// Same-category products, not real co-purchase data — the name is kept for
// URL compatibility.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ idOrSlug: string }> },
) {
  const { idOrSlug } = await ctx.params;
  const products = await getRelatedProducts(idOrSlug, localeFromRequest(req));
  if (!products) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", products });
}
