export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { RedirectSchema } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.redirect.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ message: "ok", redirects: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, RedirectSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const row = await prisma.redirect.create({
      data: { ...parsed.data, note: parsed.data.note ?? null },
    });
    return NextResponse.json({ message: "ok", redirect: row });
  } catch {
    return NextResponse.json(
      { message: "A redirect for that fromPath already exists" },
      { status: 409 },
    );
  }
}
