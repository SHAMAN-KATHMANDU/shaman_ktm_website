// The webhook contract both bots share.
//
// Extracted when the leads bot arrived: the parsing and the three rules below
// are identical for every bot, and the one thing that must differ between them
// — which bot an update belongs to — is exactly the thing a copied file would
// get wrong by forgetting to change it.
//
// Three rules:
//   1. Only Telegram may drive this — the secret token is checked first.
//   2. Every update is deduped BEFORE any work, so a re-delivery can't record
//      the same thing twice.
//   3. It always answers 200. A non-2xx makes Telegram retry the same update
//      for hours; since the work is deduped and already durable, a retry storm
//      would only add load without changing the outcome.

import { NextResponse } from "next/server";
import {
  claimUpdate,
  verifyWebhookSecret,
  type BotKey,
  type IncomingUpdate,
} from "./core";

export interface TelegramUpdateBody {
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

/** Flatten Telegram's two shapes into the one the flows understand. */
export function normaliseUpdate(body: TelegramUpdateBody): IncomingUpdate | null {
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

/**
 * Run one webhook delivery through auth, dedup, and the bot's own flow.
 *
 * `bot` is what keeps the two bots' updates apart: a private chat's id is the
 * user's id, identical for every bot, and each bot numbers its own messages
 * from 1 — so without it the second bot's message #7 would be discarded as the
 * first bot's already-handled retry.
 */
export async function handleTelegramWebhook(input: {
  req: Request;
  bot: BotKey;
  token: string;
  handle: (token: string, update: IncomingUpdate) => Promise<string>;
}): Promise<NextResponse> {
  const { req, bot, token, handle } = input;

  if (!verifyWebhookSecret(req)) {
    // 401 rather than 200: this isn't Telegram, so there is nothing to retry.
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!token) {
    console.error(`[telegram] ${bot} webhook hit with no bot token configured`);
    return NextResponse.json({ ok: true });
  }

  const body = (await req.json().catch(() => null)) as TelegramUpdateBody | null;
  if (!body) return NextResponse.json({ ok: true });

  const update = normaliseUpdate(body);
  if (!update?.telegramUserId || !update.chatId) {
    return NextResponse.json({ ok: true });
  }

  // Dedup first: a callback press and its re-delivery share a message id, so
  // claiming here is what stops a double confirm.
  const fresh = await claimUpdate({
    bot,
    chatId: update.chatId,
    telegramMessageId: update.telegramMessageId,
    telegramUserId: update.telegramUserId,
  });
  if (!fresh) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    const outcome = await handle(token, update);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    // Swallow deliberately: the update is already claimed, so a retry would be
    // deduped anyway and Telegram would keep hammering a failing path.
    console.error(`[telegram] ${bot} flow failed`, {
      chatId: update.chatId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: true, error: "handled" });
  }
}
