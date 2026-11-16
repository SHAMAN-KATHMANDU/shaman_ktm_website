export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listShowrooms } from "@/lib/api/server/showrooms";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", showrooms: await listShowrooms(localeFromRequest(req)) });
}
