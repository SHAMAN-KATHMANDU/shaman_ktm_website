export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";

const PatchBody = z
  .object({
    name: z.string().nullable().optional(),
    role: z.enum(["owner", "editor", "viewer"]).optional(),
    password: z
      .string()
      .min(12)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/\d/)
      .regex(/[^A-Za-z0-9]/)
      .optional(),
  })
  .strict();

async function ensureNotLastOwner(userId: string): Promise<boolean> {
  const owners = await prisma.adminUser.count({ where: { role: "owner" } });
  const target = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (target?.role !== "owner") return true;
  return owners > 1;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("owner");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, PatchBody);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  // Demoting the last owner would lock the workspace — reject.
  if (d.role && d.role !== "owner" && !(await ensureNotLastOwner(id))) {
    return NextResponse.json(
      { message: "Cannot demote the last owner." },
      { status: 400 },
    );
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.role !== undefined ? { role: d.role } : {}),
      ...(d.password
        ? { passwordHash: await hashPassword(d.password) }
        : {}),
    },
    select: { id: true, email: true, name: true, role: true, updatedAt: true },
  });

  logAction({
    actor: g.session.email,
    action: "update",
    entity: "AdminUser",
    entityId: id,
    summary: [
      d.role ? `role=${d.role}` : null,
      d.password ? "password reset" : null,
      d.name !== undefined ? `name="${d.name}"` : null,
    ]
      .filter(Boolean)
      .join(", "),
  });
  return NextResponse.json({ message: "ok", user: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("owner");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;

  if (id === g.session.userId) {
    return NextResponse.json(
      { message: "You cannot delete your own account." },
      { status: 400 },
    );
  }
  if (!(await ensureNotLastOwner(id))) {
    return NextResponse.json(
      { message: "Cannot delete the last owner." },
      { status: 400 },
    );
  }

  const existing = await prisma.adminUser.findUnique({
    where: { id },
    select: { email: true },
  });
  await prisma.adminUser.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "AdminUser",
    entityId: id,
    summary: existing?.email ?? null,
  });
  return NextResponse.json({ message: "ok" });
}
