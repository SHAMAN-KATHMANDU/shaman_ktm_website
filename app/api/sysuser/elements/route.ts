export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ElementSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.element.findMany({
    orderBy: [{ position: "asc" }, { slug: "asc" }],
  });
  return NextResponse.json({ message: "ok", elements: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, ElementSchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.element.create({ data: parsed.data });
  bumpTags(CACHE_TAGS.elements);
  return NextResponse.json({ message: "ok", element: row });
}
