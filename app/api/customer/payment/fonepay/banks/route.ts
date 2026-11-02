export const dynamic = "force-dynamic";

// GET: banks/wallets that support Checkout by Fonepay, for the mobile
// deep-link flow. Served from a ~1h in-module cache (the list is stable).

import { NextResponse } from "next/server";
import { customerGuard } from "@/lib/auth/customer-guard";
import {
  fetchBanksList,
  isFonepayConfigured,
} from "@/lib/payment/fonepay-intent";

export async function GET() {
  const g = await customerGuard();
  if (!g.ok) return g.response;

  if (!isFonepayConfigured()) {
    return NextResponse.json(
      { message: "Fonepay payment is not available" },
      { status: 503 },
    );
  }

  try {
    const banks = await fetchBanksList();
    return NextResponse.json({ message: "ok", banks });
  } catch (err) {
    console.error(
      "[fonepay] bank list failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { message: "Could not load the bank list" },
      { status: 502 },
    );
  }
}
