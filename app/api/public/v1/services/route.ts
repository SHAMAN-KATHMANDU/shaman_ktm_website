export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listServices } from "@/lib/api/server/services";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", services: await listServices(localeFromRequest(req)) });
}
