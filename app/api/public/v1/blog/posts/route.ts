export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listBlogPosts } from "@/lib/api/server/blog";
import { localeFromRequest } from "@/lib/i18n/locale";

const num = (v: string | null) => (v ? parseInt(v, 10) : undefined);

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const res = await listBlogPosts(
    {
      page: num(sp.get("page")),
      limit: num(sp.get("limit")),
      categorySlug: sp.get("categorySlug") || undefined,
      tag: sp.get("tag") || undefined,
      q: sp.get("q") || undefined,
    },
    localeFromRequest(req),
  );
  return NextResponse.json({ message: "ok", ...res });
}
