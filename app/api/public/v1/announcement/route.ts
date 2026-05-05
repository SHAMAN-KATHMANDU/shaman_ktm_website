export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const row = await prisma.announcement.findUnique({ where: { id: 1 } });
    if (!row) {
      return NextResponse.json({ message: "ok", announcement: null });
    }
    return NextResponse.json({
      message: "ok",
      announcement: {
        enabled: row.enabled,
        message: row.message,
        href: row.href,
        bgColor: row.bgColor,
        fgColor: row.fgColor,
        dismissable: row.dismissable,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ message: "ok", announcement: null });
  }
}
