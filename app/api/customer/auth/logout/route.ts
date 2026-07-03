export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  clearCustomerSession,
  getCustomerSession,
} from "@/lib/auth/customer-session";
import { logCustomerAction } from "@/lib/audit";

export async function POST() {
  const s = await getCustomerSession();
  if (s.email) {
    logCustomerAction({
      actor: s.email,
      action: "logout",
      entity: "Customer",
      entityId: s.customerId,
    });
  }
  await clearCustomerSession();
  return NextResponse.json({ message: "ok" });
}
