export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listBundles } from "@/lib/api/server/bundles";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", bundles: await listBundles(localeFromRequest(req)) });
}
