export const dynamic = "force-dynamic";

// Bulk-toggle "featured on home" / "new release" flags from the products
// table view. Body shape: { ids: string[], isFeatured?: boolean, isNewRelease?: boolean }

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

const Body = z.object({
  ids: z.array(z.string()).min(1),
  isFeatured: z.boolean().optional(),
  isNewRelease: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.response;

  const data: { isFeatured?: boolean; isNewRelease?: boolean } = {};
  if (parsed.data.isFeatured !== undefined) data.isFeatured = parsed.data.isFeatured;
  if (parsed.data.isNewRelease !== undefined) data.isNewRelease = parsed.data.isNewRelease;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: "Nothing to update" },
      { status: 400 },
    );
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: parsed.data.ids } },
    data,
  });

  bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage);
  return NextResponse.json({ message: "ok", updated: result.count });
}
