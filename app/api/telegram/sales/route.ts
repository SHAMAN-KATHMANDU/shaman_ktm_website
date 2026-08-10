export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { claimUpdate, verifyWebhookSecret } from "@/lib/telegram/core";
import { handleSaleUpdate, type IncomingUpdate } from "@/lib/telegram/sale-flow";

// Telegram webhook for the sales bot.
//
// Three things this route must get right:
//   1. Only Telegram may drive it — the secret token is checked first.
//   2. Every update is deduped BEFORE any work, so a re-delivery can't post a
//      second sale.
//   3. It always answers 200. A non-2xx makes Telegram retry the same update
//      for hours; since the work is deduped and already durable, a retry storm
//      would only add load without changing the outcome.

interface TelegramUpdateBody {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string };
    from?: { id: number | string };
    photo?: { file_id: string; file_size?: number }[];
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number | string };
    message?: { message_id: number; chat: { id: number | string } };
  };
}

/** Flatten Telegram's two shapes into the one the flow understands. */
function normalise(body: TelegramUpdateBody): IncomingUpdate | null {
  if (body.callback_query?.message) {
    const cq = body.callback_query;
    return {
      chatId: String(cq.message!.chat.id),
      telegramUserId: String(cq.from?.id ?? ""),
      telegramMessageId: cq.message!.message_id,
      callbackData: cq.data,
      callbackQueryId: cq.id,
    };
  }
  if (body.message) {
    const m = body.message;
    // Telegram sends several sizes of the same photo; the last is the largest.
    const photo = m.photo?.[m.photo.length - 1];
    return {
      chatId: String(m.chat.id),
      telegramUserId: String(m.from?.id ?? ""),
      telegramMessageId: m.message_id,
      text: m.text,
      photoFileId: photo?.file_id,
    };
  }
  return null;
}

export async function POST(req: Request) {
  if (!verifyWebhookSecret(req)) {
    // 401 rather than 200: this isn't Telegram, so there is nothing to retry.
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = env.TELEGRAM_SALES_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] sales webhook hit with no bot token configured");
    return NextResponse.json({ ok: true });
  }

  const body = (await req.json().catch(() => null)) as TelegramUpdateBody | null;
  if (!body) return NextResponse.json({ ok: true });

  const update = normalise(body);
  if (!update?.telegramUserId || !update.chatId) {
    return NextResponse.json({ ok: true });
  }

  // Dedup first: a callback press and its re-delivery share a message id, so
  // claiming here is what stops a double confirm.
  const fresh = await claimUpdate({
    chatId: update.chatId,
    telegramMessageId: update.telegramMessageId,
    telegramUserId: update.telegramUserId,
  });
  if (!fresh) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    const outcome = await handleSaleUpdate(token, update);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    // Swallow deliberately: the update is already claimed, so a retry would be
    // deduped anyway and Telegram would keep hammering a failing path.
    console.error("[telegram] sales flow failed", {
      chatId: update.chatId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: true, error: "handled" });
  }
}
