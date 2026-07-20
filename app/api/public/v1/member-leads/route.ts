export const dynamic = "force-dynamic";

// Member Circle join form on the storefront. Leads land in the MemberLead
// table with status "new" and are worked from /sysuser/member-leads.
// Anonymous endpoint, so two spam guards: a fixed-window IP rate limit and a
// honeypot field ("website") that must stay empty.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MemberLeadSchema } from "@/lib/validation/schemas";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

const RATE_MAX = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`member-lead:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { message: "Too many requests — please try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = MemberLeadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid submission", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Honeypot tripped — pretend success so bots learn nothing.
  if (d.website) {
    return NextResponse.json({ message: "ok", lead: { pending: true } });
  }

  // Same number resubmitted while still unworked → refresh, don't duplicate.
  const normalizedWhatsapp = d.whatsapp.replace(/[ ()-]/g, "");
  const existing = await prisma.memberLead.findFirst({
    where: { whatsapp: normalizedWhatsapp, status: "new" },
    select: { id: true },
  });
  if (existing) {
    await prisma.memberLead.update({
      where: { id: existing.id },
      data: { name: d.name, email: d.email || null },
    });
    return NextResponse.json({ message: "ok", lead: { pending: true } });
  }

  await prisma.memberLead.create({
    data: {
      name: d.name,
      whatsapp: normalizedWhatsapp,
      email: d.email || null,
      source: d.source || "homepage-member-circle",
    },
  });

  return NextResponse.json({ message: "ok", lead: { pending: true } });
}
