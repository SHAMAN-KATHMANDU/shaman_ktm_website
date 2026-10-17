export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveSessionForRoute } from "@/lib/upload-sessions/http";
import { submitUploadSession, toUploadSessionView } from "@/lib/upload-sessions";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const result = await resolveSessionForRoute(req, token);
  if (!result.ok) return result.response;

  try {
    const submitted = await submitUploadSession(result.session);

    return NextResponse.json({
      message: "ok",
      session: toUploadSessionView(submitted),
    });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    throw err;
  }
}
