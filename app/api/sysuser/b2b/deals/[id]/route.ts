export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { getDeal } from "@/lib/b2b";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  try {
    const deal = await getDeal(id);
    return NextResponse.json({ message: "ok", deal });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
