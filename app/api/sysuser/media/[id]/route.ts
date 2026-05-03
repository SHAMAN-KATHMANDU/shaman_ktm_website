export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { deleteObject } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.media.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  try {
    await deleteObject(row.key);
  } catch {
    // If S3 delete fails (key already gone), still drop the DB row.
  }
  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ message: "ok" });
}
