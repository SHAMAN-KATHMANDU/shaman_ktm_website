export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveSessionForRoute } from "@/lib/upload-sessions/http";
import { addDraftSlot, toUploadSessionView } from "@/lib/upload-sessions";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const result = await resolveSessionForRoute(req, token);
  if (!result.ok) return result.response;

  try {
    const { slotId, position } = await addDraftSlot(result.session);

    // Resolve fresh session to return updated state
    const { resolveUploadSession } = await import("@/lib/upload-sessions");
    const updated = await resolveUploadSession(token);
    if (!updated) {
      return NextResponse.json(
        { message: "This upload link has expired or is invalid." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "ok",
      slotId,
      position,
      session: toUploadSessionView(updated),
    });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    throw err;
  }
}
