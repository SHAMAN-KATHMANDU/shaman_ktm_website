export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listProducts } from "@/lib/api/server/products";
import type { ListProductsParams } from "@/lib/api/types";
import { localeFromRequest } from "@/lib/i18n/locale";

const num = (v: string | null) => (v ? parseInt(v, 10) : undefined);

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const featured = sp.get("featured");
  const res = await listProducts(
    {
      page: num(sp.get("page")),
      limit: num(sp.get("limit")),
      categoryId: sp.get("categoryId") || undefined,
      categorySlug: sp.get("categorySlug") || undefined,
      elementSlug: (sp.get("elementSlug") || undefined) as ListProductsParams["elementSlug"],
      search: sp.get("search") || undefined,
      sort: (sp.get("sort") || undefined) as ListProductsParams["sort"],
      minPrice: num(sp.get("minPrice")),
      maxPrice: num(sp.get("maxPrice")),
      featured: featured === "1" || featured === "true",
    },
    localeFromRequest(req),
  );
  return NextResponse.json({ message: "ok", ...res });
}
