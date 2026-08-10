// The /sale conversation.
//
// Shape of the flow, from the spec: photograph each item's QR tag while packing
// (batched is fine — no need to interrupt a live sale), pick variation and
// quantity per item, then the bot EXPLICITLY asks for the payment screenshot
// (decision #9), then a DRAFT sale, then a human confirms and only then does
// stock move.
//
// Two rules this file must never break:
//   · nothing bypasses draft → confirmed
//   · a misread is corrected by a new record, never a silent edit

import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { createSaleDraft, confirmSale, discardSaleDraft, getSale } from "@/lib/sales";
import { formatNpr } from "@/lib/format";
import {
  answerCallback,
  clearSession,
  decodeQr,
  downloadTelegramFile,
  getSession,
  linkUpdate,
  resolveProduct,
  resolveStaffByTelegramId,
  sendMessage,
  setSession,
  storeEvidence,
  type TelegramActor,
} from "./core";
import type { SaleSessionItem, TelegramSessionState } from "./session-state";

export interface IncomingUpdate {
  chatId: string;
  telegramUserId: string;
  telegramMessageId: number;
  text?: string;
  photoFileId?: string;
  callbackData?: string;
  callbackQueryId?: string;
}

const CANCEL_HINT = "Send /cancel to start over.";

async function reply(
  token: string,
  actor: TelegramActor,
  text: string,
  buttons?: { text: string; data: string }[][],
) {
  await sendMessage(token, actor.chatId, text, buttons);
}

/** Showrooms as buttons, for a floater who must say where they are. */
async function showroomButtons() {
  const rooms = await prisma.showroom.findMany({
    where: { active: true },
    select: { key: true, name: true },
    orderBy: { position: "asc" },
  });
  return rooms.map((r) => [{ text: r.name, data: `room:${r.key}` }]);
}

async function paymentButtons() {
  const methods = await prisma.paymentMethodLookup.findMany({
    where: { active: true },
    select: { id: true, label: true },
    orderBy: [{ channel: "asc" }, { label: "asc" }],
  });
  return methods.map((m) => [{ text: m.label, data: `pay:${m.id}` }]);
}

function itemsSummary(items: SaleSessionItem[], names: Map<string, string>) {
  return items
    .map((i, n) => `${n + 1}. ${names.get(i.variationId ?? i.productId) ?? "item"} × ${i.qty}`)
    .join("\n");
}

/**
 * Handle one update. Returns a short tag describing what happened, which the
 * route logs and the tests assert on.
 */
export async function handleSaleUpdate(
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
        ? "Your staff record is inactive, so sales can't be recorded under it. Ask an admin to reactivate you."
        : "I don't recognise this Telegram account. Ask an admin to add your Telegram ID to your staff record, then try again.",
    );
    return "unregistered";
  }

  const text = update.text?.trim() ?? "";

  // ── Commands that work from anywhere ──
  if (text === "/cancel") {
    const session = await getSession(update.telegramUserId);
    // A draft that never got confirmed is discarded, not left lying around.
    if (session?.draftSaleId) {
      await discardSaleDraft(session.draftSaleId).catch(() => {});
    }
    await clearSession(update.telegramUserId);
    await reply(token, actor, "Cancelled. Send /sale when you're ready.");
    return "cancelled";
  }

  if (text === "/start" || text === "/help") {
    await reply(
      token,
      actor,
      [
        `Hello ${staff.name}.`,
        "",
        "<b>/sale</b> — record a sale. Photograph each item's QR tag (send them all, one after another), pick the variation and quantity, then send the payment screenshot.",
        "<b>/cancel</b> — abandon what you're doing.",
        "",
        "Nothing leaves stock until you confirm at the end.",
      ].join("\n"),
    );
    return "help";
  }

  if (text === "/sale") {
    const showroomKey = staff.defaultShowroomKey;
    if (!showroomKey) {
      // Floater: must say where this sale happened.
      await setSession(actor, { flow: "sale", step: "picking_showroom", items: [] });
      await reply(token, actor, "Which showroom are you at?", await showroomButtons());
      return "sale:asked_showroom";
    }
    await setSession(actor, {
      flow: "sale",
      step: "awaiting_qr",
      showroomKey,
      items: [],
    });
    await reply(
      token,
      actor,
      "Photograph the QR tag on each item — send them one after another, no rush.\n\nIf a tag won't scan, just type its IMS code instead.",
    );
    return "sale:started";
  }

  // ── Everything below needs a live conversation ──
  const session = await getSession(update.telegramUserId);
  if (!session || session.flow !== "sale") {
    await reply(token, actor, "Send /sale to record a sale.");
    return "no_session";
  }

  const save = (patch: Partial<TelegramSessionState>) =>
    setSession(actor, { ...session, ...patch });

  switch (session.step) {
    // ── Floater picks a showroom ──
    case "picking_showroom": {
      const key = update.callbackData?.startsWith("room:")
        ? update.callbackData.slice(5)
        : null;
      if (!key) {
        await reply(token, actor, "Pick a showroom using the buttons above.");
        return "sale:awaiting_showroom";
      }
      await save({ step: "awaiting_qr", showroomKey: key });
      await reply(
        token,
        actor,
        "Photograph the QR tag on each item — send them one after another.\n\nIf a tag won't scan, type its IMS code instead.",
      );
      return "sale:showroom_set";
    }

    // ── Scan or type an item ──
    case "awaiting_qr": {
      let payload: string | null = null;

      if (update.photoFileId) {
        const file = await downloadTelegramFile(token, update.photoFileId);
        if (!file) {
          await reply(
            token,
            actor,
            "That photo didn't come through. Send it again, or type the IMS code.",
          );
          return "sale:photo_failed";
        }
        payload = await decodeQr(file.bytes);
        if (!payload) {
          await reply(
            token,
            actor,
            "I couldn't read a QR code in that photo. Try a straighter, closer shot — or just type the IMS code.",
          );
          return "sale:qr_unreadable";
        }
      } else if (text && !text.startsWith("/")) {
        payload = text;
      } else {
        await reply(
          token,
          actor,
          "Send a photo of the QR tag, or type the IMS code. " + CANCEL_HINT,
        );
        return "sale:awaiting_item";
      }

      const product = await resolveProduct(payload);
      if (!product) {
        await reply(
          token,
          actor,
          `Nothing matches <code>${payload}</code>. Check the code and try again, or type it manually.`,
        );
        return "sale:product_not_found";
      }
      if (product.variations.length === 0) {
        await reply(
          token,
          actor,
          `${product.name} has no active variations, so it can't be sold from stock. Tell an admin, and carry on with the next item.`,
        );
        return "sale:no_variations";
      }

      await save({ step: "picking_variation", pendingProductId: product.id });
      await reply(
        token,
        actor,
        `<b>${product.name}</b>\nWhich one?`,
        product.variations.map((v) => [
          {
            text: `${v.label ?? v.sku} — ${formatNpr(v.price)} (${v.stock} in stock)`,
            data: `var:${v.id}`,
          },
        ]),
      );
      return "sale:product_found";
    }

    // ── Which variation ──
    case "picking_variation": {
      const variationId = update.callbackData?.startsWith("var:")
        ? update.callbackData.slice(4)
        : null;
      if (!variationId) {
        await reply(token, actor, "Pick which one using the buttons above.");
        return "sale:awaiting_variation";
      }
      await save({ step: "picking_qty", pendingVariationId: variationId });
      await reply(
        token,
        actor,
        "How many?",
        [
          [1, 2, 3].map((n) => ({ text: String(n), data: `qty:${n}` })),
          [4, 5, 10].map((n) => ({ text: String(n), data: `qty:${n}` })),
        ],
      );
      return "sale:variation_picked";
    }

    // ── How many ──
    case "picking_qty": {
      const fromButton = update.callbackData?.startsWith("qty:")
        ? Number(update.callbackData.slice(4))
        : null;
      const qty = fromButton ?? (text ? Number(text) : Number.NaN);
      if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
        await reply(token, actor, "Send a whole number, or use the buttons.");
        return "sale:awaiting_qty";
      }
      const items: SaleSessionItem[] = [
        ...(session.items ?? []),
        {
          productId: session.pendingProductId!,
          variationId: session.pendingVariationId,
          qty,
        },
      ];
      await setSession(actor, {
        ...session,
        step: "asking_more_items",
        items,
        pendingProductId: undefined,
        pendingVariationId: undefined,
      });
      await reply(token, actor, `Added. ${items.length} item(s) so far.`, [
        [
          { text: "Scan another", data: "more:yes" },
          { text: "That's everything", data: "more:no" },
        ],
      ]);
      return "sale:item_added";
    }

    // ── Another item, or move on ──
    case "asking_more_items": {
      const choice = update.callbackData ?? "";
      if (choice === "more:yes") {
        await save({ step: "awaiting_qr" });
        await reply(token, actor, "Send the next QR tag, or type its IMS code.");
        return "sale:more_items";
      }
      if (choice !== "more:no") {
        await reply(token, actor, "Scan another, or say that's everything.");
        return "sale:awaiting_more_choice";
      }
      await save({ step: "asking_payment_method" });
      await reply(token, actor, "How did they pay?", await paymentButtons());
      return "sale:items_done";
    }

    // ── Payment method ──
    case "asking_payment_method": {
      const methodId = update.callbackData?.startsWith("pay:")
        ? update.callbackData.slice(4)
        : null;
      if (!methodId) {
        await reply(token, actor, "Choose how they paid, using the buttons.");
        return "sale:awaiting_payment_method";
      }
      await save({ step: "asking_payment_screenshot", paymentMethodId: methodId });
      // Decision #9: the bot asks for the evidence outright rather than hoping
      // someone remembers to send it.
      await reply(
        token,
        actor,
        "Now send a photo of the payment — the QR confirmation, bank slip, or the cash in hand.\n\nIf there's genuinely nothing to photograph, send <b>skip</b>.",
      );
      return "sale:payment_method_set";
    }

    // ── The payment screenshot ──
    case "asking_payment_screenshot": {
      let evidenceUrl: string | undefined;

      if (update.photoFileId) {
        const file = await downloadTelegramFile(token, update.photoFileId);
        if (!file) {
          await reply(token, actor, "That didn't come through — send it again, or send <b>skip</b>.");
          return "sale:evidence_failed";
        }
        evidenceUrl = await storeEvidence({
          bytes: file.bytes,
          mime: file.mime,
          label: `payment-${update.telegramUserId}`,
        });
      } else if (text.toLowerCase() !== "skip") {
        await reply(
          token,
          actor,
          "Send the payment photo, or <b>skip</b> if there's nothing to show.",
        );
        return "sale:awaiting_evidence";
      }

      // Build the draft. Prices come from the database — the bot only ever
      // supplies items and quantities.
      try {
        const draft = await createSaleDraft(
          {
            channel: "showroom",
            showroomKey: session.showroomKey ?? null,
            inputSource: "telegram",
            lines: (session.items ?? []).map((i) => ({
              productId: i.productId,
              variationId: i.variationId ?? null,
              qty: i.qty,
            })),
            paymentMethodId: session.paymentMethodId ?? null,
            paymentEvidenceUrl: evidenceUrl ?? null,
            staff: [{ staffId: staff.id, role: "sold_by" }],
          },
          staff.id,
        );
        await setSession(actor, {
          ...session,
          step: "confirming_draft",
          draftSaleId: draft.id,
          paymentScreenshotUrl: evidenceUrl,
        });

        const full = await getSale(draft.id);
        const names = new Map(
          full.lines.map((l) => [
            l.variationId ?? l.productId,
            `${l.productName}${l.variantLabel ? ` (${l.variantLabel})` : ""}`,
          ]),
        );
        await reply(
          token,
          actor,
          [
            "<b>Ready to record</b>",
            itemsSummary(session.items ?? [], names),
            "",
            `Total: <b>${formatNpr(full.totalAmount)}</b>`,
            evidenceUrl ? "Payment photo saved." : "No payment photo.",
            "",
            "Nothing has left stock yet — confirm to record it.",
          ].join("\n"),
          [
            [
              { text: "✓ Confirm", data: "confirm:yes" },
              { text: "Discard", data: "confirm:no" },
            ],
          ],
        );
        return "sale:draft_created";
      } catch (err) {
        const message =
          err instanceof CmsError ? err.message : "Something went wrong building the sale.";
        await reply(token, actor, `${message}\n\n${CANCEL_HINT}`);
        return "sale:draft_failed";
      }
    }

    // ── Confirm: the only place stock moves ──
    case "confirming_draft": {
      const choice = update.callbackData ?? "";
      if (choice === "confirm:no") {
        if (session.draftSaleId) {
          await discardSaleDraft(session.draftSaleId).catch(() => {});
        }
        await clearSession(update.telegramUserId);
        await reply(token, actor, "Discarded — nothing was recorded.");
        return "sale:discarded";
      }
      if (choice !== "confirm:yes") {
        await reply(token, actor, "Confirm or discard using the buttons above.");
        return "sale:awaiting_confirm";
      }

      try {
        const sale = await confirmSale({
          saleId: session.draftSaleId!,
          confirmedByStaffId: staff.id,
        });
        await linkUpdate({
          chatId: update.chatId,
          telegramMessageId: update.telegramMessageId,
          refType: "Sale",
          refId: sale.id,
        });
        await clearSession(update.telegramUserId);
        await reply(
          token,
          actor,
          `Recorded as <b>${sale.saleNo}</b> — ${formatNpr(sale.totalAmount)}, stock taken from ${sale.showroomKey}.\n\nSend /sale for the next one.`,
        );
        return "sale:confirmed";
      } catch (err) {
        // Insufficient stock is the common case: say so plainly and leave the
        // draft alone so it can be fixed rather than silently lost.
        const message =
          err instanceof CmsError
            ? err.message
            : "Couldn't record that sale.";
        await reply(
          token,
          actor,
          `${message}\n\nThe sale is still a draft — an admin can sort the stock and confirm it in the admin panel, or send /cancel to drop it.`,
        );
        return "sale:confirm_failed";
      }
    }

    default: {
      await clearSession(update.telegramUserId);
      await reply(token, actor, "Let's start again — send /sale.");
      return "sale:reset";
    }
  }
}
