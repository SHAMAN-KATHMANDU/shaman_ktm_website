// CRM service (spec Module A). Two rules shape everything here:
//
//  1. Numbers are queries, never typed. `countLeadsByStatus` derives a day's
//     "New sms – 10, Warm – 3" from individually-attributable rows, so nobody
//     can inflate or shrink a figure without fabricating leads.
//  2. Status history is append-only and dated. Every status change writes a
//     CrmLeadStatusHistory row in the SAME transaction as the status update,
//     including the row written at creation — so a lead's history is complete
//     from its first moment and can never be reconstructed after the fact.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PHYSICAL_SHOWROOM_WHERE } from "@/lib/stock/constants";
import { CmsError } from "@/lib/cms/errors";
import {
  LEAD_INTERESTS,
  LEAD_STATUSES,
  FOLLOWUP_CHANNELS,
  TERMINAL_STATUSES,
  normalizeLeadPhone,
  type FollowupChannel,
  type LeadInterest,
  type LeadStatus,
} from "./constants";

const MAX_PAGE_SIZE = 500;

export interface CreateLeadInput {
  name: string;
  phone: string;
  phoneAlt?: string | null;
  email?: string | null;
  sourceId: string;
  interest: LeadInterest;
  status?: LeadStatus;
  askedLocation?: boolean;
  willVisit?: boolean;
  visitDate?: Date | null;
  followUpDate?: Date | null;
  assignedStaffId?: string | null;
  showroomKey?: string | null;
  notes?: string | null;
  evidenceUrl?: string | null;
}

async function assertSourceExists(
  tx: Prisma.TransactionClient,
  sourceId: string,
) {
  const source = await tx.leadSource.findUnique({
    where: { id: sourceId },
    select: { id: true },
  });
  if (!source) {
    const options = await tx.leadSource.findMany({
      where: { active: true },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    });
    throw new CmsError("Lead source not found", {
      statusCode: 404,
      availableOptions: options.map((s) => `${s.id} (${s.label})`),
      referenceKind: "sourceId",
    });
  }
}

async function assertStaffExists(
  tx: Prisma.TransactionClient,
  staffId: string,
  field: string,
) {
  const staff = await tx.staff.findUnique({
    where: { id: staffId },
    select: { id: true },
  });
  if (!staff) {
    const options = await tx.staff.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    throw new CmsError("Staff member not found", {
      statusCode: 404,
      availableOptions: options.map((s) => `${s.id} (${s.name})`),
      referenceKind: field,
    });
  }
}

async function assertShowroomExists(
  tx: Prisma.TransactionClient,
  showroomKey: string,
) {
  const showroom = await tx.showroom.findFirst({
    where: { key: showroomKey, ...PHYSICAL_SHOWROOM_WHERE, active: true },
    select: { key: true },
  });
  if (!showroom) {
    const keys = await tx.showroom.findMany({
      where: { ...PHYSICAL_SHOWROOM_WHERE, active: true },
      select: { key: true },
    });
    throw new CmsError("Showroom not found", {
      statusCode: 404,
      availableOptions: keys.map((s) => s.key),
      referenceKind: "showroomKey",
    });
  }
}

/**
 * Record a new lead. `createdAt` is server-generated and the opening
 * status-history row is written in the same transaction, so a lead can never
 * exist without an attributable origin.
 */
export async function createLead(
  input: CreateLeadInput,
  createdByStaffId: string,
) {
  if (!LEAD_INTERESTS.includes(input.interest)) {
    throw new CmsError(`Unknown interest "${input.interest}"`, {
      statusCode: 400,
      availableOptions: [...LEAD_INTERESTS],
      referenceKind: "interest",
    });
  }
  const status = input.status ?? "new";
  if (!LEAD_STATUSES.includes(status)) {
    throw new CmsError(`Unknown status "${status}"`, {
      statusCode: 400,
      availableOptions: [...LEAD_STATUSES],
      referenceKind: "status",
    });
  }

  return prisma.$transaction(async (tx) => {
    await assertSourceExists(tx, input.sourceId);
    await assertStaffExists(tx, createdByStaffId, "createdByStaffId");
    if (input.assignedStaffId) {
      await assertStaffExists(tx, input.assignedStaffId, "assignedStaffId");
    }
    if (input.showroomKey) await assertShowroomExists(tx, input.showroomKey);

    const lead = await tx.crmLead.create({
      data: {
        name: input.name,
        phone: input.phone,
        phoneAlt: input.phoneAlt ?? null,
        email: input.email ?? null,
        sourceId: input.sourceId,
        interest: input.interest,
        status,
        askedLocation: input.askedLocation ?? false,
        willVisit: input.willVisit ?? false,
        visitDate: input.visitDate ?? null,
        followUpDate: input.followUpDate ?? null,
        assignedStaffId: input.assignedStaffId ?? null,
        showroomKey: input.showroomKey ?? null,
        notes: input.notes ?? null,
        evidenceUrl: input.evidenceUrl ?? null,
        createdByStaffId,
      },
    });

    await tx.crmLeadStatusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: null, // null marks the row written at creation
        toStatus: status,
        changedByStaffId: createdByStaffId,
        note: "Lead created",
      },
    });

    return lead;
  });
}

/**
 * Change a lead's status. The update and its history row are one transaction —
 * there is no code path that moves a status without dating who moved it.
 */
export async function changeLeadStatus(input: {
  leadId: string;
  toStatus: LeadStatus;
  changedByStaffId: string;
  note?: string | null;
}) {
  if (!LEAD_STATUSES.includes(input.toStatus)) {
    throw new CmsError(`Unknown status "${input.toStatus}"`, {
      statusCode: 400,
      availableOptions: [...LEAD_STATUSES],
      referenceKind: "toStatus",
    });
  }

  return prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.findUnique({
      where: { id: input.leadId },
      select: { id: true, status: true },
    });
    if (!lead) throw new CmsError("Lead not found", { statusCode: 404 });
    await assertStaffExists(tx, input.changedByStaffId, "changedByStaffId");

    if (lead.status === input.toStatus) {
      throw new CmsError(`Lead is already "${input.toStatus}"`, {
        statusCode: 409,
      });
    }
    // A converted or do-not-contact lead is not silently re-triaged; reopening
    // is a deliberate act that must clear the terminal state first.
    if (TERMINAL_STATUSES.includes(lead.status as LeadStatus)) {
      throw new CmsError(
        `Lead is "${lead.status}" — reopen it explicitly before moving it to "${input.toStatus}"`,
        { statusCode: 409 },
      );
    }

    // Capture the outgoing status before the update, so the history row records
    // where the lead came from regardless of read/write ordering.
    const fromStatus = lead.status;
    const updated = await tx.crmLead.update({
      where: { id: input.leadId },
      data: { status: input.toStatus },
    });
    await tx.crmLeadStatusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus,
        toStatus: input.toStatus,
        changedByStaffId: input.changedByStaffId,
        note: input.note ?? null,
      },
    });
    return updated;
  });
}

/**
 * Reopen a terminal lead (purchase / dnc). Separate from changeLeadStatus so
 * the act is explicit and shows up as its own dated history row.
 */
export async function reopenLead(input: {
  leadId: string;
  toStatus: LeadStatus;
  changedByStaffId: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.findUnique({
      where: { id: input.leadId },
      select: { id: true, status: true },
    });
    if (!lead) throw new CmsError("Lead not found", { statusCode: 404 });
    if (!TERMINAL_STATUSES.includes(lead.status as LeadStatus)) {
      throw new CmsError(
        `Lead is "${lead.status}", not a terminal status — use a normal status change`,
        { statusCode: 409 },
      );
    }
    if (TERMINAL_STATUSES.includes(input.toStatus)) {
      throw new CmsError("Reopen must target a non-terminal status", {
        statusCode: 400,
        availableOptions: LEAD_STATUSES.filter(
          (s) => !TERMINAL_STATUSES.includes(s),
        ) as string[],
      });
    }
    await assertStaffExists(tx, input.changedByStaffId, "changedByStaffId");

    const fromStatus = lead.status;
    const updated = await tx.crmLead.update({
      where: { id: input.leadId },
      data: { status: input.toStatus },
    });
    await tx.crmLeadStatusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus,
        toStatus: input.toStatus,
        changedByStaffId: input.changedByStaffId,
        note: input.note ?? "Reopened",
      },
    });
    return updated;
  });
}

/** Update lead details. Status changes go through changeLeadStatus only. */
export async function updateLeadDetails(
  leadId: string,
  input: Partial<Omit<CreateLeadInput, "status">>,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.crmLead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });
    if (!existing) throw new CmsError("Lead not found", { statusCode: 404 });
    if (input.sourceId) await assertSourceExists(tx, input.sourceId);
    if (input.assignedStaffId) {
      await assertStaffExists(tx, input.assignedStaffId, "assignedStaffId");
    }
    if (input.showroomKey) await assertShowroomExists(tx, input.showroomKey);
    if (input.interest && !LEAD_INTERESTS.includes(input.interest)) {
      throw new CmsError(`Unknown interest "${input.interest}"`, {
        statusCode: 400,
        availableOptions: [...LEAD_INTERESTS],
        referenceKind: "interest",
      });
    }

    return tx.crmLead.update({
      where: { id: leadId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.phoneAlt !== undefined
          ? { phoneAlt: input.phoneAlt || null }
          : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.sourceId !== undefined ? { sourceId: input.sourceId } : {}),
        ...(input.interest !== undefined ? { interest: input.interest } : {}),
        ...(input.askedLocation !== undefined
          ? { askedLocation: input.askedLocation }
          : {}),
        ...(input.willVisit !== undefined ? { willVisit: input.willVisit } : {}),
        ...(input.visitDate !== undefined
          ? { visitDate: input.visitDate ?? null }
          : {}),
        ...(input.followUpDate !== undefined
          ? { followUpDate: input.followUpDate ?? null }
          : {}),
        ...(input.assignedStaffId !== undefined
          ? { assignedStaffId: input.assignedStaffId || null }
          : {}),
        ...(input.showroomKey !== undefined
          ? { showroomKey: input.showroomKey || null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.evidenceUrl !== undefined
          ? { evidenceUrl: input.evidenceUrl || null }
          : {}),
      },
    });
  });
}

export async function addFollowup(input: {
  leadId: string;
  staffId: string;
  followupAt?: Date;
  channel: FollowupChannel;
  gotResponse?: boolean;
  notes?: string | null;
}) {
  if (!FOLLOWUP_CHANNELS.includes(input.channel)) {
    throw new CmsError(`Unknown follow-up channel "${input.channel}"`, {
      statusCode: 400,
      availableOptions: [...FOLLOWUP_CHANNELS],
      referenceKind: "channel",
    });
  }
  return prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.findUnique({
      where: { id: input.leadId },
      select: { id: true },
    });
    if (!lead) throw new CmsError("Lead not found", { statusCode: 404 });
    await assertStaffExists(tx, input.staffId, "staffId");
    return tx.crmFollowup.create({
      data: {
        leadId: input.leadId,
        staffId: input.staffId,
        followupAt: input.followupAt ?? new Date(),
        channel: input.channel,
        gotResponse: input.gotResponse ?? false,
        notes: input.notes ?? null,
      },
    });
  });
}

export interface LeadFilters {
  status?: LeadStatus;
  interest?: LeadInterest;
  sourceId?: string;
  showroomKey?: string;
  assignedStaffId?: string;
  /** Case-insensitive match on name or phone. */
  q?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

function whereFromFilters(f: LeadFilters): Prisma.CrmLeadWhereInput {
  return {
    ...(f.status ? { status: f.status } : {}),
    ...(f.interest ? { interest: f.interest } : {}),
    ...(f.sourceId ? { sourceId: f.sourceId } : {}),
    ...(f.showroomKey ? { showroomKey: f.showroomKey } : {}),
    ...(f.assignedStaffId ? { assignedStaffId: f.assignedStaffId } : {}),
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: "insensitive" as const } },
            { phone: { contains: f.q } },
            { phoneAlt: { contains: f.q } },
          ],
        }
      : {}),
    ...(f.from || f.to
      ? {
          createdAt: {
            ...(f.from ? { gte: f.from } : {}),
            ...(f.to ? { lte: f.to } : {}),
          },
        }
      : {}),
  };
}

export async function listLeads(filters: LeadFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 100));
  const where = whereFromFilters(filters);
  const [total, leads] = await Promise.all([
    prisma.crmLead.count({ where }),
    prisma.crmLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        source: { select: { id: true, label: true } },
        assignedStaff: { select: { id: true, name: true } },
        createdByStaff: { select: { id: true, name: true } },
        showroom: { select: { key: true, name: true } },
        _count: { select: { followups: true } },
      },
    }),
  ]);
  return { leads, total, page, limit };
}

export async function getLead(leadId: string) {
  const lead = await prisma.crmLead.findUnique({
    where: { id: leadId },
    include: {
      source: { select: { id: true, label: true } },
      assignedStaff: { select: { id: true, name: true } },
      createdByStaff: { select: { id: true, name: true } },
      showroom: { select: { key: true, name: true } },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedByStaff: { select: { id: true, name: true } } },
      },
      followups: {
        orderBy: { followupAt: "desc" },
        include: { staff: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) throw new CmsError("Lead not found", { statusCode: 404 });
  return lead;
}

/**
 * The daily/monthly report figure, derived — this is what replaces the typed
 * WhatsApp tally. Counts leads per status over an optional date range.
 */
export async function countLeadsByStatus(
  filters: Omit<LeadFilters, "page" | "limit" | "status"> = {},
) {
  const grouped = await prisma.crmLead.groupBy({
    by: ["status"],
    where: whereFromFilters(filters),
    _count: { _all: true },
  });
  const counts = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, 0]),
  ) as Record<LeadStatus, number>;
  for (const row of grouped) {
    if (row.status in counts) counts[row.status as LeadStatus] = row._count._all;
  }
  return counts;
}

export interface WebEnquiryInput {
  name: string;
  phone: string;
  email?: string | null;
  interest: LeadInterest;
  /** Composed into the note — the enquiry's own words are what staff read. */
  companyName?: string | null;
  productInterest?: string | null;
  quantityNeeded?: number | null;
  note?: string | null;
}

/**
 * A lead the public website submitted — nobody on staff wrote it down.
 *
 * This is the ONLY path allowed to leave createdByStaffId null, which is why it
 * is a separate function rather than a nullable argument on createLead(): a
 * missing staff id should be impossible to pass by accident from the admin or
 * bot paths. Where it came from is still recorded — sourceId is required, and
 * defaults to the seeded "Website" source.
 *
 * Re-enquiring is normal (a shop asks about three products over a week), so a
 * still-open lead on the same number gains a dated note instead of becoming a
 * second row that would double-count in the month's figures.
 */
export async function createWebEnquiry(input: WebEnquiryInput) {
  if (!LEAD_INTERESTS.includes(input.interest)) {
    throw new CmsError(`Unknown interest "${input.interest}"`, {
      statusCode: 400,
      availableOptions: [...LEAD_INTERESTS],
      referenceKind: "interest",
    });
  }

  // Upsert rather than require: a public form must not 500 because a lookup
  // row was never seeded.
  const source = await prisma.leadSource.upsert({
    where: { label: "Website" },
    update: {},
    create: { label: "Website" },
    select: { id: true },
  });

  const detail = [
    input.companyName ? `Company: ${input.companyName}` : null,
    input.productInterest ? `Interested in: ${input.productInterest}` : null,
    input.quantityNeeded ? `Quantity: ${input.quantityNeeded}` : null,
    input.note,
  ]
    .filter(Boolean)
    .join(" · ");

  const target = normalizeLeadPhone(input.phone);
  const open = await prisma.crmLead.findMany({
    where: { status: { notIn: [...TERMINAL_STATUSES] } },
    select: { id: true, phone: true, notes: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const existing = open.find((l) => normalizeLeadPhone(l.phone) === target);

  if (existing) {
    const stamp = new Date().toISOString().slice(0, 10);
    return prisma.crmLead.update({
      where: { id: existing.id },
      data: {
        notes: [existing.notes, `[${stamp}] Enquired again — ${detail}`]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        sourceId: source.id,
        interest: input.interest,
        status: "new",
        notes: detail || null,
        createdByStaffId: null,
      },
    });

    // The history is complete from the lead's first moment here too — the
    // author is simply nobody.
    await tx.crmLeadStatusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: null,
        toStatus: "new",
        changedByStaffId: null,
        note: "Submitted from the website",
      },
    });

    return lead;
  });
}

/**
 * One-time promotion of a Member Circle signup into the CRM pipeline. The
 * MemberLead row is left untouched (its own queue keeps working); this is a
 * copy-forward, not a sync, and it is idempotent per MemberLead.
 */
export async function promoteMemberLead(input: {
  memberLeadId: string;
  createdByStaffId: string;
  sourceId?: string;
  interest?: LeadInterest;
}) {
  const memberLead = await prisma.memberLead.findUnique({
    where: { id: input.memberLeadId },
  });
  if (!memberLead) {
    throw new CmsError("Member lead not found", { statusCode: 404 });
  }

  // Idempotency: a MemberLead promoted twice would double-count in reports.
  const already = await prisma.crmLead.findFirst({
    where: {
      phone: memberLead.whatsapp,
      notes: { contains: `member-lead:${memberLead.id}` },
    },
    select: { id: true },
  });
  if (already) {
    throw new CmsError("Member lead already promoted to CRM", {
      statusCode: 409,
      availableOptions: [already.id],
      referenceKind: "crmLeadId",
    });
  }

  const sourceId =
    input.sourceId ??
    (
      await prisma.leadSource.findUnique({
        where: { label: "Website" },
        select: { id: true },
      })
    )?.id;
  if (!sourceId) {
    throw new CmsError(
      'No lead source given and the "Website" source is missing — seed the lookups or pass sourceId.',
      { statusCode: 400, referenceKind: "sourceId" },
    );
  }

  return createLead(
    {
      name: memberLead.name,
      phone: memberLead.whatsapp,
      email: memberLead.email,
      sourceId,
      interest: input.interest ?? "retail",
      notes: [memberLead.note, `member-lead:${memberLead.id}`]
        .filter(Boolean)
        .join(" · "),
    },
    input.createdByStaffId,
  );
}
