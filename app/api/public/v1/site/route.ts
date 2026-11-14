export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSite } from "@/lib/api/server/site";

export async function GET() {
  const site = await getSite();
  if (!site) {
    return NextResponse.json({ message: "Not configured" }, { status: 404 });
  }
  return NextResponse.json({ message: "ok", site });
}
