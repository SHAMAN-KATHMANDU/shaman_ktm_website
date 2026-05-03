import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const s = await getSession();
  if (!s.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    message: "ok",
    user: { email: s.email, name: s.name },
  });
}
