export const dynamic = "force-dynamic";

// Consent detail + decision for a pending OAuth authorization request.
// Owner-only (matches manual MCP-token creation): approving here mints the
// single-use code and stamps the grant with this admin + the chosen role, so
// tokens issued from it act with exactly that authority.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import {
  approveConsent,
  denyConsent,
  getConsentRequest,
} from "@/lib/oauth/grants";
import { rateLimit } from "@/lib/oauth/rate-limit";

const DecisionSchema = z.object({
  approved: z.boolean(),
  role: z.enum(["owner", "editor", "viewer"]).default("editor"),
});

type Params = { params: Promise<{ requestId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const { requestId } = await ctx.params;
  const row = await getConsentRequest(requestId);
  if (!row) {
    return NextResponse.json(
      { message: "Request not found, expired, or already decided." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    clientName: row.client.clientName ?? row.client.clientId,
    redirectHost: new URL(row.redirectUri).host,
    scope: row.scope,
    expiresAt: row.expiresAt,
    actingAs: guard.session.email,
  });
}

export async function POST(req: Request, ctx: Params) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`consent:${guard.session.userId}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { message: "Too many consent decisions — try again later." },
      { status: 429 },
    );
  }

  const parsed = await parseJson(req, DecisionSchema);
  if (!parsed.ok) return parsed.response;

  const { requestId } = await ctx.params;

  if (!parsed.data.approved) {
    const denied = await denyConsent(requestId);
    if (!denied) {
      return NextResponse.json(
        { message: "Request not found, expired, or already decided." },
        { status: 404 },
      );
    }
    return NextResponse.json({ redirectTo: denied.redirectTo });
  }

  const approved = await approveConsent({
    requestId,
    role: parsed.data.role,
    adminEmail: guard.session.email,
    adminUserId: guard.session.userId,
  });
  if (!approved) {
    return NextResponse.json(
      { message: "Request not found, expired, or already decided." },
      { status: 404 },
    );
  }

  logAction({
    actor: guard.session.email,
    action: "create",
    entity: "OAuthGrant",
    entityId: requestId,
    summary: `approved ${approved.clientName ?? "OAuth client"} (${parsed.data.role})`,
  });

  return NextResponse.json({ redirectTo: approved.redirectTo });
}
