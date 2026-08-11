export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";

const CreateBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  // "staff" was added to the role ladder with the reporting system but never
  // reached this endpoint, so a staff login couldn't actually be created here.
  role: z.enum(["owner", "editor", "staff", "viewer"]).default("editor"),
  // Optional: create the linked Staff record in the same step. Reporting rows
  // are attributed to a Staff row, and the bots identify people by their
  // Telegram id, so setting both here turns a three-screen chore into one form.
  telegramUserId: z.string().trim().min(1).optional(),
  defaultShowroomKey: z.string().trim().min(1).optional(),
  createStaffRecord: z.boolean().optional(),
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
  const g = await requireRole("owner");
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
      // So the list can show who can use the bots, and who still needs an id.
      staff: {
        select: {
          id: true,
          name: true,
          telegramUserId: true,
          defaultShowroomKey: true,
          active: true,
        },
      },
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

  // A staff login is only useful with a Staff row behind it — that's what every
  // reporting record is attributed to — so create one unless told otherwise.
  const wantsStaff =
    d.createStaffRecord ?? (d.role === "staff" || !!d.telegramUserId);

  if (d.telegramUserId) {
    const clash = await prisma.staff.findUnique({
      where: { telegramUserId: d.telegramUserId },
      select: { name: true },
    });
    if (clash) {
      return NextResponse.json(
        {
          message: `That Telegram id is already registered to ${clash.name}. A Telegram account can only belong to one staff member.`,
        },
        { status: 409 },
      );
    }
  }
  if (d.defaultShowroomKey) {
    const showroom = await prisma.showroom.findUnique({
      where: { key: d.defaultShowroomKey },
      select: { key: true },
    });
    if (!showroom) {
      const keys = await prisma.showroom.findMany({ select: { key: true } });
      return NextResponse.json(
        {
          message: `No showroom "${d.defaultShowroomKey}".`,
          availableOptions: keys.map((s) => s.key),
        },
        { status: 404 },
      );
    }
  }

  const passwordHash = await hashPassword(d.password);
  // One transaction: a login without its staff record, or a staff record
  // without its login, would both be half-finished setup someone has to notice.
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.adminUser.create({
      data: {
        email: d.email,
        name: d.name ?? null,
        role: d.role,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!wantsStaff) return { ...user, staff: null };

    const staff = await tx.staff.create({
      data: {
        name: d.name?.trim() || d.email.split("@")[0],
        adminUserId: user.id,
        telegramUserId: d.telegramUserId ?? null,
        defaultShowroomKey: d.defaultShowroomKey ?? null,
      },
      select: {
        id: true,
        name: true,
        telegramUserId: true,
        defaultShowroomKey: true,
      },
    });
    return { ...user, staff };
  });

  logAction({
    actor: g.session.email,
    action: "create",
    entity: "AdminUser",
    entityId: created.id,
    summary: [
      `${created.email} (${created.role})`,
      created.staff ? "with staff record" : null,
      d.telegramUserId ? `telegram ${d.telegramUserId}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });
  return NextResponse.json({ message: "ok", user: created });
}
