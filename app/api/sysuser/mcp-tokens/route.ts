export const dynamic = "force-dynamic";

// MCP connections list. Tokens are minted exclusively by the OAuth 2.1 flow
// (/api/oauth/*) — manual creation was removed with the connections redesign;
// revocation lives in [id]/route.ts.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";

export async function GET() {
  const guard = await requireRole("viewer");
  if (!guard.ok) return guard.response;

  const tokens = await prisma.mcpToken.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      createdBy: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      oauthClient: {
        select: { id: true, clientId: true, clientName: true, label: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}
