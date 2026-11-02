export const dynamic = "force-dynamic";

// GET: whether the Fonepay payment option should be offered at checkout.
// Public — exposes only a boolean, no credentials.

import { NextResponse } from "next/server";
import { isFonepayConfigured } from "@/lib/payment/fonepay-intent";

export async function GET() {
  return NextResponse.json({ enabled: isFonepayConfigured() });
}
