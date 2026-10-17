export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parseJson } from "@/lib/api/server/respond";
import { resolveSessionForRoute } from "@/lib/upload-sessions/http";
import { confirmSessionUpload, resolveUploadSession, toUploadSessionView } from "@/lib/upload-sessions";
import { ConfirmUploadSchema } from "@/lib/validation/schemas";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const result = await resolveSessionForRoute(req, token);
  if (!result.ok) return result.response;

  const parsed = await parseJson(req, ConfirmUploadSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await confirmSessionUpload(result.session, parsed.data);

    // Resolve fresh session to return updated state
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
