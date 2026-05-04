export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminGuard, requireRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";

const CreateBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(["owner", "editor", "viewer"]).default("editor"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/\d/, "Must include a digit")
    .regex(/[^A-Za-z0-9]/, "Must include a symbol"),
});

export async function GET() {
  // Listing is allowed for any authenticated admin so editors can see who
  // owns the workspace; mutations below are owner-only.
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ message: "ok", users: rows });
}

export async function POST(req: Request) {
  const g = await requireRole("owner");
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, CreateBody);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const exists = await prisma.adminUser.findUnique({
    where: { email: d.email },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json(
      { message: `An admin with email ${d.email} already exists.` },
      { status: 409 },
    );
  }

  const created = await prisma.adminUser.create({
    data: {
      email: d.email,
      name: d.name ?? null,
      role: d.role,
      passwordHash: await hashPassword(d.password),
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  logAction({
    actor: g.session.email,
    action: "create",
    entity: "AdminUser",
    entityId: created.id,
    summary: `${created.email} (${created.role})`,
  });
  return NextResponse.json({ message: "ok", user: created });
}
