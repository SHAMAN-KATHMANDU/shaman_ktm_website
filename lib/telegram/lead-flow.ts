// The /lead conversation.
//
// This is the intake path that replaces "10 new SMS today" typed into a
// WhatsApp group at closing time. Every lead it records is an individually
// attributable row with a server-set timestamp, so the day's figure is a query
// over things that happened rather than someone's recollection of them.
//
// What that costs, and why it's worth it: the bot asks for source, interest and
// status one at a time instead of accepting a free-text dump. Those three are
// what every later report groups by, and a lead that arrives without them is a
// row nobody can count.
//
// Rules this file must not break:
//   · a lead is written once, at the end, after the staff member sees it — no
//     half-built lead ever reaches the table
//   · lead source and interest stay separate fields (where they came from is
//     not what they want), per the spec
//   · a screenshot is retained as evidence, never read and discarded

import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { createLead } from "@/lib/crm";
import {
  LEAD_PHONE_PATTERN,
  normalizeLeadPhone,
  type LeadInterest,
  type LeadStatus,
} from "@/lib/crm/constants";
import {
  answerCallback,
  clearSession,
  downloadTelegramFile,
  getSession,
  linkUpdate,
  resolveStaffByTelegramId,
  sendMessage,
  setSession,
  showroomButtons,
  storeEvidence,
  type BotKey,
  type IncomingUpdate,
  type TelegramActor,
} from "./core";
import type { TelegramSessionState } from "./session-state";

/** Sessions and update-dedup are keyed per bot; see BotKey. */
const BOT: BotKey = "leads";

const CANCEL_HINT = "Send /cancel to start over.";

// Intake statuses only. "purchase" is set by linking a sale and "dnc" is a
// decision made later in the admin panel — neither is something to pick while
// first writing a lead down, and offering them here would invite a status that
// no sale or conversation backs up.
const INTAKE_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "hot", label: "Hot — actively talking" },
  { value: "warm", label: "Warm — started, not finished" },
  { value: "cold", label: "Cold — no reply yet" },
  { value: "new", label: "New — not triaged" },
];

const INTERESTS: { value: LeadInterest; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "wholesale_b2b", label: "Wholesale / B2B" },
  { value: "custom_order", label: "Custom order" },
];

async function reply(
  token: string,
  actor: TelegramActor,
  text: string,
  buttons?: { text: string; data: string }[][],
) {
  await sendMessage(token, actor.chatId, text, buttons);
}

async function sourceButtons() {
  const sources = await prisma.leadSource.findMany({
    where: { active: true },
    select: { id: true, label: true },
    orderBy: { label: "asc" },
  });
  return sources.map((s) => [{ text: s.label, data: `src:${s.id}` }]);
}

/**
 * An open lead already on file for this number.
 *
 * Phone numbers are stored as they were typed — "+977 98…", "98-…" and "98…"
 * are the same person — so the comparison happens on the stripped form. The
 * candidate set is deliberately small: non-terminal leads only, newest first,
 * capped. Missing an old duplicate is a far smaller problem than scanning the
 * whole table on every lead a staff member enters.
 */
async function findOpenLeadByPhone(phone: string) {
  const target = normalizeLeadPhone(phone);
  if (!target) return null;
  const candidates = await prisma.crmLead.findMany({
    where: { status: { notIn: ["purchase", "dnc"] } },
    select: { id: true, name: true, phone: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return candidates.find((c) => normalizeLeadPhone(c.phone) === target) ?? null;
}

function summarise(
  state: TelegramSessionState,
  sourceLabel: string,
  showroomName: string | null,
) {
  const lines = [
    "<b>Ready to save</b>",
    `Name: ${state.leadName}`,
    `Phone: ${state.leadPhone}`,
    `Source: ${sourceLabel}`,
    `Wants: ${INTERESTS.find((i) => i.value === state.leadInterest)?.label ?? state.leadInterest}`,
    `Status: ${state.leadStatus}`,
  ];
  if (state.leadWillVisit) {
    lines.push(
      state.leadVisitDate
        ? `Visiting: yes — ${state.leadVisitDate}`
        : "Visiting: yes",
    );
  } else if (state.leadAskedLocation) {
    lines.push("Visiting: no");
  }
  if (showroomName) lines.push(`Showroom: ${showroomName}`);
  if (state.leadEvidenceUrl) lines.push("Screenshot saved.");
  if (state.notesDraft) lines.push(`Note: ${state.notesDraft}`);
  return lines.join("\n");
}

/**
 * Handle one update. Returns a short tag describing what happened, which the
 * route logs and the tests assert on.
 */
export async function handleLeadUpdate(
  token: string,
  update: IncomingUpdate,
): Promise<string> {
  const actor: TelegramActor = {
    chatId: update.chatId,
    telegramUserId: update.telegramUserId,
  };
  if (update.callbackQueryId) {
    await answerCallback(token, update.callbackQueryId);
  }

  // ── Who is this? ──
  const staff = await resolveStaffByTelegramId(update.telegramUserId);
  if (!staff || !staff.active) {
    await reply(
      token,
      actor,
      staff
        ? "Your staff record is inactive, so leads can't be recorded under it. Ask an admin to reactivate you."
        : "I don't recognise this Telegram account. Ask an admin to add your Telegram ID to your staff record, then try again.",
    );
    return "unregistered";
  }

  const text = update.text?.trim() ?? "";

  // ── Commands that work from anywhere ──
  if (text === "/cancel") {
    // Nothing to clean up: a lead is only written at the confirm step, so an
    // abandoned conversation leaves no row behind.
    await clearSession(BOT, update.telegramUserId);
    await reply(token, actor, "Cancelled. Send /lead when you're ready.");
    return "cancelled";
  }

  if (text === "/start" || text === "/help") {
    await reply(
      token,
      actor,
      [
        `Hello ${staff.name}.`,
        "",
        "<b>/lead</b> — record an enquiry. I'll ask for the name, number, where they came from, what they're after, and how warm they are.",
        "<b>/cancel</b> — abandon what you're doing.",
        "",
        "Nothing is saved until you confirm at the end.",
      ].join("\n"),
    );
    return "help";
  }

  if (text === "/lead") {
    const showroomKey = staff.defaultShowroomKey;
    if (!showroomKey) {
      await setSession(BOT, actor, { flow: "lead", step: "picking_showroom" });
      await reply(token, actor, "Which showroom are you at?", await showroomButtons());
      return "lead:asked_showroom";
    }
    await setSession(BOT, actor, {
      flow: "lead",
      step: "collecting_name",
      showroomKey,
    });
    await reply(token, actor, "What's their name?");
    return "lead:started";
  }

  // ── Everything below needs a live conversation ──
  const session = await getSession(BOT, update.telegramUserId);
  if (!session || session.flow !== "lead") {
    await reply(token, actor, "Send /lead to record an enquiry.");
    return "no_session";
  }

  const save = (patch: Partial<TelegramSessionState>) =>
    setSession(BOT, actor, { ...session, ...patch });

  switch (session.step) {
    // ── Floater picks a showroom ──
    case "picking_showroom": {
      const key = update.callbackData?.startsWith("room:")
        ? update.callbackData.slice(5)
        : null;
      if (!key) {
        await reply(token, actor, "Pick a showroom using the buttons above.");
        return "lead:awaiting_showroom";
      }
      await save({ step: "collecting_name", showroomKey: key });
      await reply(token, actor, "What's their name?");
      return "lead:showroom_set";
    }

    // ── Name ──
    case "collecting_name": {
      if (!text || text.startsWith("/")) {
        await reply(token, actor, `Send their name. ${CANCEL_HINT}`);
        return "lead:awaiting_name";
      }
      if (text.length > 120) {
        await reply(token, actor, "That's too long for a name — send a shorter one.");
        return "lead:name_too_long";
      }
      await save({ step: "collecting_phone", leadName: text });
      await reply(
        token,
        actor,
        "Their phone or WhatsApp number?\n\nSend <b>skip</b> if you genuinely don't have one — but a lead with no number is one nobody can follow up.",
      );
      return "lead:name_set";
    }

    // ── Phone ──
    case "collecting_phone": {
      if (!text || text.startsWith("/")) {
        await reply(token, actor, `Send their number, or <b>skip</b>. ${CANCEL_HINT}`);
        return "lead:awaiting_phone";
      }
      // A number is how this person is recognised next time, so an unusable one
      // is worse than none: it looks like a contact and isn't.
      const phone = text.toLowerCase() === "skip" ? "" : text;
      if (phone && !LEAD_PHONE_PATTERN.test(phone)) {
        await reply(
          token,
          actor,
          "That doesn't look like a phone number. Send it with digits only, like <code>9812345678</code> — or <b>skip</b>.",
        );
        return "lead:phone_invalid";
      }

      const existing = phone ? await findOpenLeadByPhone(phone) : null;
      await save({
        step: "collecting_source",
        leadPhone: phone,
        duplicateLeadId: existing?.id,
      });
      await reply(
        token,
        actor,
        existing
          ? `Heads up — <b>${existing.name}</b> is already on file with that number (${existing.status}, added ${existing.createdAt.toISOString().slice(0, 10)}). Carry on if this is a fresh enquiry.\n\nWhere did they come from?`
          : "Where did they come from?",
        await sourceButtons(),
      );
      return existing ? "lead:phone_set_duplicate" : "lead:phone_set";
    }

    // ── Source: where they came from ──
    case "collecting_source": {
      const sourceId = update.callbackData?.startsWith("src:")
        ? update.callbackData.slice(4)
        : null;
      if (!sourceId) {
        await reply(token, actor, "Pick where they came from, using the buttons.");
        return "lead:awaiting_source";
      }
      await save({ step: "collecting_interest", leadSourceId: sourceId });
      // Deliberately a separate question from source: an Instagram DM asking
      // about wholesale is one lead, and reports need both halves of that.
      await reply(
        token,
        actor,
        "What are they after?",
        INTERESTS.map((i) => [{ text: i.label, data: `int:${i.value}` }]),
      );
      return "lead:source_set";
    }

    // ── Interest: what they want ──
    case "collecting_interest": {
      const value = update.callbackData?.startsWith("int:")
        ? update.callbackData.slice(4)
        : null;
      const interest = INTERESTS.find((i) => i.value === value)?.value;
      if (!interest) {
        await reply(token, actor, "Pick what they're after, using the buttons.");
        return "lead:awaiting_interest";
      }
      await save({ step: "collecting_status", leadInterest: interest });
      await reply(
        token,
        actor,
        "How warm are they?",
        INTAKE_STATUSES.map((s) => [{ text: s.label, data: `st:${s.value}` }]),
      );
      return "lead:interest_set";
    }

    // ── Status: how warm ──
    case "collecting_status": {
      const value = update.callbackData?.startsWith("st:")
        ? update.callbackData.slice(3)
        : null;
      const status = INTAKE_STATUSES.find((s) => s.value === value)?.value;
      if (!status) {
        await reply(token, actor, "Pick how warm they are, using the buttons.");
        return "lead:awaiting_status";
      }
      await save({
        step: "collecting_visit",
        leadStatus: status as TelegramSessionState["leadStatus"],
      });
      await reply(token, actor, "Are they coming in?", [
        [{ text: "Yes — coming to the showroom", data: "visit:yes" }],
        [{ text: "No", data: "visit:no" }],
        [{ text: "Didn't ask", data: "visit:unasked" }],
      ]);
      return "lead:status_set";
    }

    // ── Visit intent: one tap for askedLocation + willVisit ──
    case "collecting_visit": {
      const choice = update.callbackData ?? "";
      if (choice === "visit:yes") {
        await save({
          step: "collecting_visit_date",
          leadAskedLocation: true,
          leadWillVisit: true,
        });
        await reply(
          token,
          actor,
          "When? Send the date as <code>YYYY-MM-DD</code>, or tap Skip.",
          [[{ text: "Skip", data: "visitdate:skip" }]],
        );
        return "lead:visit_yes";
      }
      if (choice === "visit:no" || choice === "visit:unasked") {
        await save({
          step: "collecting_evidence",
          leadAskedLocation: choice === "visit:no",
          leadWillVisit: false,
        });
        await reply(
          token,
          actor,
          "Anything to attach? Send a screenshot of the chat, or type a short note.\n\nSend <b>skip</b> if there's neither.",
        );
        return "lead:visit_no";
      }
      await reply(token, actor, "Answer using the buttons above.");
      return "lead:awaiting_visit";
    }

    // ── Visit date (optional) ──
    case "collecting_visit_date": {
      const skipped =
        update.callbackData === "visitdate:skip" || text.toLowerCase() === "skip";
      let visitDate: string | undefined;
      if (!skipped) {
        // Strict YYYY-MM-DD only. A bot conversation is exactly where a
        // half-parsed "next Tuesday" would silently become the wrong date, and
        // the calendar here is ambiguous anyway (AD vs BS).
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        const parsed = match ? new Date(`${text}T00:00:00Z`) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
          await reply(
            token,
            actor,
            "Send the date as <code>YYYY-MM-DD</code> (for example <code>2026-08-20</code>), or tap Skip.",
          );
          return "lead:visit_date_invalid";
        }
        visitDate = text;
      }
      await save({ step: "collecting_evidence", leadVisitDate: visitDate });
      await reply(
        token,
        actor,
        "Anything to attach? Send a screenshot of the chat, or type a short note.\n\nSend <b>skip</b> if there's neither.",
      );
      return "lead:visit_date_set";
    }

    // ── Evidence: a screenshot, a note, or neither ──
    case "collecting_evidence": {
      let evidenceUrl: string | undefined;
      let note: string | undefined;

      if (update.photoFileId) {
        const file = await downloadTelegramFile(token, update.photoFileId);
        if (!file) {
          await reply(
            token,
            actor,
            "That didn't come through — send it again, type a note, or send <b>skip</b>.",
          );
          return "lead:evidence_failed";
        }
        evidenceUrl = await storeEvidence({
          bytes: file.bytes,
          mime: file.mime,
          label: `lead-${update.telegramUserId}`,
        });
      } else if (!text || text.startsWith("/")) {
        await reply(token, actor, `Send a screenshot, a note, or <b>skip</b>. ${CANCEL_HINT}`);
        return "lead:awaiting_evidence";
      } else if (text.toLowerCase() !== "skip") {
        note = text.slice(0, 2000);
      }

      const next: TelegramSessionState = {
        ...session,
        step: "confirming_details",
        leadEvidenceUrl: evidenceUrl,
        notesDraft: note,
      };
      await setSession(BOT, actor, next);

      const [source, showroom] = await Promise.all([
        session.leadSourceId
          ? prisma.leadSource.findUnique({
              where: { id: session.leadSourceId },
              select: { label: true },
            })
          : null,
        session.showroomKey
          ? prisma.showroom.findUnique({
              where: { key: session.showroomKey },
              select: { name: true },
            })
          : null,
      ]);

      const duplicate = next.duplicateLeadId
        ? await prisma.crmLead.findUnique({
            where: { id: next.duplicateLeadId },
            select: { name: true, status: true },
          })
        : null;

      await reply(
        token,
        actor,
        [
          summarise(next, source?.label ?? "—", showroom?.name ?? null),
          ...(duplicate
            ? [
                "",
                `⚠ <b>${duplicate.name}</b> already has this number (${duplicate.status}). Saving adds a second record — discard instead if it's the same enquiry.`,
              ]
            : []),
        ].join("\n"),
        [
          [
            { text: "✓ Save lead", data: "lead:yes" },
            { text: "Discard", data: "lead:no" },
          ],
        ],
      );
      return "lead:ready";
    }

    // ── Confirm: the only place a lead is written ──
    case "confirming_details": {
      const choice = update.callbackData ?? "";
      if (choice === "lead:no") {
        await clearSession(BOT, update.telegramUserId);
        await reply(token, actor, "Discarded — nothing was saved.");
        return "lead:discarded";
      }
      if (choice !== "lead:yes") {
        await reply(token, actor, "Save or discard using the buttons above.");
        return "lead:awaiting_confirm";
      }

      try {
        const lead = await createLead(
          {
            name: session.leadName ?? "",
            phone: session.leadPhone ?? "",
            email: session.leadEmail ?? null,
            sourceId: session.leadSourceId ?? "",
            interest: (session.leadInterest ?? "retail") as LeadInterest,
            status: (session.leadStatus ?? "new") as LeadStatus,
            askedLocation: session.leadAskedLocation ?? false,
            willVisit: session.leadWillVisit ?? false,
            visitDate: session.leadVisitDate
              ? new Date(`${session.leadVisitDate}T00:00:00Z`)
              : null,
            // Whoever took the enquiry owns the follow-up until someone
            // reassigns it — an unassigned lead is one no one chases.
            assignedStaffId: staff.id,
            showroomKey: session.showroomKey ?? null,
            notes: session.notesDraft ?? null,
            evidenceUrl: session.leadEvidenceUrl ?? null,
          },
          staff.id,
        );
        await linkUpdate({
          bot: BOT,
          chatId: update.chatId,
          telegramMessageId: update.telegramMessageId,
          refType: "CrmLead",
          refId: lead.id,
        });
        await clearSession(BOT, update.telegramUserId);
        await reply(
          token,
          actor,
          `Saved — <b>${lead.name}</b> (${lead.status}), assigned to you.\n\nSend /lead for the next one.`,
        );
        return "lead:created";
      } catch (err) {
        // The work is still in the session, so the staff member can fix the one
        // bad answer rather than retyping the lead from the start.
        const message =
          err instanceof CmsError ? err.message : "Couldn't save that lead.";
        await reply(token, actor, `${message}\n\n${CANCEL_HINT}`);
        return "lead:create_failed";
      }
    }

    default: {
      await clearSession(BOT, update.telegramUserId);
      await reply(token, actor, "Let's start again — send /lead.");
      return "lead:reset";
    }
  }
}
