export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { parseJson } from "@/lib/api/server/respond";
import { resolveSessionForRoute } from "@/lib/upload-sessions/http";
import { signSessionUpload } from "@/lib/upload-sessions";
import { SignUploadSchema } from "@/lib/validation/schemas";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const result = await resolveSessionForRoute(req, token);
  if (!result.ok) return result.response;

  const parsed = await parseJson(req, SignUploadSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { uploadUrl, publicUrl, key } = await signSessionUpload(
      result.session,
      parsed.data,
    );

    return NextResponse.json({
      message: "ok",
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    throw err;
  }
}
