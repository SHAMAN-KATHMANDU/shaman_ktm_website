export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listCategories } from "@/lib/api/server/categories";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", categories: await listCategories(localeFromRequest(req)) });
}
