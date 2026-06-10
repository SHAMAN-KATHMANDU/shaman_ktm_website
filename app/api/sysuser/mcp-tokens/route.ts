export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { generateMcpToken } from "@/lib/mcp/auth";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

const CreateMcpTokenSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(["owner", "editor", "viewer"]).default("editor"),
  expiresAt: z.string().datetime().optional(),
});

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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}

export async function POST(req: Request) {
  const guard = await requireRole("owner");
  if (!guard.ok) return guard.response;

  const parsed = await parseJson(req, CreateMcpTokenSchema);
  if (!parsed.ok) return parsed.response;

  try {
    // Check for duplicate name
    const existing = await prisma.mcpToken.findFirst({
      where: { name: parsed.data.name },
    });
    if (existing) {
      throw new CmsError("A token with this name already exists.", {
        statusCode: 409,
      });
    }

    const { token, tokenHash } = generateMcpToken();

    const row = await prisma.mcpToken.create({
      data: {
        name: parsed.data.name,
        tokenHash,
        role: parsed.data.role,
        createdBy: guard.session.email,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
      },
    });

    logAction({
      actor: guard.session.email,
      action: "create",
      entity: "McpToken",
      entityId: row.id,
      summary: row.name,
    });

    return NextResponse.json({
      token,
      id: row.id,
      name: row.name,
      role: row.role,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    return NextResponse.json(
      { message: "Failed to create token" },
      { status: 500 },
    );
  }
}
