export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parseJson } from "@/lib/api/server/respond";
import { resolveSessionForRoute } from "@/lib/upload-sessions/http";
import { renameDraftSlot, toUploadSessionView } from "@/lib/upload-sessions";
import { RenameSlotSchema } from "@/lib/validation/schemas";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ token: string; slotId: string }> },
) {
  const { token, slotId } = await ctx.params;

  const result = await resolveSessionForRoute(req, token);
  if (!result.ok) return result.response;

  const parsed = await parseJson(req, RenameSlotSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await renameDraftSlot(result.session, slotId, parsed.data.name);

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
      session: toUploadSessionView(updated),
    });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    throw err;
  }
}
