// Shared plumbing for both bots: who is talking, has this update already been
// handled, where does the half-finished conversation live, and how do photos
// become retained evidence.
//
// Two non-negotiables from the spec live here:
//   · every update is deduped before anything is written, so a webhook retry
//     can never post a second sale
//   · screenshots are kept and linked, not discarded after reading

import { prisma } from "@/lib/db";
import { PHYSICAL_SHOWROOM_WHERE } from "@/lib/stock/constants";
import { env } from "@/lib/env";
import { putObject } from "@/lib/s3";
import { slugify } from "@/lib/format";
import {
  parseSessionState,
  type TelegramSessionState,
} from "./session-state";

/** How long a half-finished conversation survives inactivity. */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Which bot an update or session belongs to.
 *
 * This has to be carried explicitly everywhere: Telegram gives a private chat
 * the user's own id, the same value for every bot, and each bot numbers its
 * messages from 1 within that chat. Sales #7 and leads #7 are therefore
 * indistinguishable without it.
 */
export type BotKey = "sales" | "leads";

export interface TelegramActor {
  telegramUserId: string;
  chatId: string;
}

/**
 * One update, flattened from Telegram's several shapes (a message, a photo, a
 * button press) into what a flow actually needs.
 */
export interface IncomingUpdate {
  chatId: string;
  telegramUserId: string;
  telegramMessageId: number;
  text?: string;
  photoFileId?: string;
  callbackData?: string;
  callbackQueryId?: string;
}

// ─── Identity ────────────────────────────────────────────────────────────────

/**
 * The Staff row behind a Telegram user, or null. Unregistered people can and do
 * message the bot; they get a clear answer rather than a crash.
 */
export async function resolveStaffByTelegramId(telegramUserId: string) {
  return prisma.staff.findUnique({
    where: { telegramUserId },
    select: {
      id: true,
      name: true,
      active: true,
      defaultShowroomKey: true,
    },
  });
}

// ─── Dedup ───────────────────────────────────────────────────────────────────

/**
 * Claim an update, returning false if it has already been handled.
 *
 * Telegram re-delivers when we are slow or a response is lost. The unique
 * (chatId, messageId) index does the real work: two concurrent deliveries race
 * to insert, and exactly one wins.
 */
export async function claimUpdate(input: {
  bot: BotKey;
  chatId: string;
  telegramMessageId: number;
  telegramUserId: string;
}): Promise<boolean> {
  // createMany + skipDuplicates rather than create-and-catch: the unique index
  // still decides the winner, but a losing retry comes back as count 0 instead
  // of an exception Prisma logs as an error. Retries are a normal event here,
  // and they should not read as failures in the logs.
  const { count } = await prisma.telegramUpdate.createMany({
    data: [
      {
        bot: input.bot,
        chatId: input.chatId,
        telegramMessageId: input.telegramMessageId,
        telegramUserId: input.telegramUserId,
      },
    ],
    skipDuplicates: true,
  });
  return count === 1;
}

/** Record what an update produced, so a sale can be traced back to its message. */
export async function linkUpdate(input: {
  bot: BotKey;
  chatId: string;
  telegramMessageId: number;
  refType: string;
  refId: string;
}) {
  await prisma.telegramUpdate.updateMany({
    where: {
      bot: input.bot,
      chatId: input.chatId,
      telegramMessageId: input.telegramMessageId,
    },
    data: { refType: input.refType, refId: input.refId },
  });
}

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * The live conversation for a user, or null when there is none or it has gone
 * stale. An expired session is deleted rather than resumed: picking up a
 * half-scanned sale from an hour ago is worse than starting over.
 */
export async function getSession(
  bot: BotKey,
  telegramUserId: string,
): Promise<TelegramSessionState | null> {
  const row = await prisma.telegramSession.findUnique({
    where: { bot_telegramUserId: { bot, telegramUserId } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    // deleteMany, not delete: an already-gone row is the normal case here, and
    // delete() would log a Prisma error before our catch could swallow it.
    await prisma.telegramSession.deleteMany({ where: { bot, telegramUserId } });
    return null;
  }
  return parseSessionState(row.state);
}

export async function setSession(
  bot: BotKey,
  actor: TelegramActor,
  state: TelegramSessionState,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.telegramSession.upsert({
    where: { bot_telegramUserId: { bot, telegramUserId: actor.telegramUserId } },
    update: { chatId: actor.chatId, state: state as object, expiresAt },
    create: {
      bot,
      telegramUserId: actor.telegramUserId,
      chatId: actor.chatId,
      state: state as object,
      expiresAt,
    },
  });
}

export async function clearSession(
  bot: BotKey,
  telegramUserId: string,
): Promise<void> {
  // Clearing a session that isn't there is a normal outcome (a /cancel after a
  // timeout, say), so this must not raise or log.
  await prisma.telegramSession.deleteMany({ where: { bot, telegramUserId } });
}

// ─── Telegram file download ──────────────────────────────────────────────────

const TELEGRAM_API = "https://api.telegram.org";
const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;

/**
 * Fetch a photo the user sent. Telegram gives a file id; resolving it to bytes
 * is a two-step call, and the token appears only in the download URL.
 */
export async function downloadTelegramFile(
  botToken: string,
  fileId: string,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const metaRes = await fetch(
    `${TELEGRAM_API}/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
    { signal: AbortSignal.timeout(15_000) },
  ).catch(() => null);
  if (!metaRes?.ok) return null;

  const meta = (await metaRes.json().catch(() => null)) as {
    ok?: boolean;
    result?: { file_path?: string; file_size?: number };
  } | null;
  const filePath = meta?.result?.file_path;
  if (!meta?.ok || !filePath) return null;
  if ((meta.result?.file_size ?? 0) > MAX_EVIDENCE_BYTES) return null;

  const fileRes = await fetch(
    `${TELEGRAM_API}/file/bot${botToken}/${filePath}`,
    { signal: AbortSignal.timeout(30_000) },
  ).catch(() => null);
  if (!fileRes?.ok) return null;

  const buf = new Uint8Array(await fileRes.arrayBuffer());
  if (buf.byteLength > MAX_EVIDENCE_BYTES) return null;
  return {
    bytes: buf,
    mime: fileRes.headers.get("content-type") ?? "image/jpeg",
  };
}

/**
 * Keep a photo as evidence and return its public URL.
 *
 * Screenshots are retained rather than discarded after parsing — that's what
 * makes a bot-entered sale auditable later.
 */
export async function storeEvidence(input: {
  bytes: Uint8Array;
  mime: string;
  label: string;
}): Promise<string> {
  const ext = input.mime.includes("png") ? ".png" : ".jpg";
  const datePart = new Date().toISOString().slice(0, 10);
  const key = `telegram/${datePart}/${slugify(input.label)}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  return putObject(key, input.bytes, input.mime);
}

// ─── QR ──────────────────────────────────────────────────────────────────────

/**
 * Read a QR code out of a photo.
 *
 * sharp rasterises to the RGBA buffer jsqr wants. Both are loaded lazily so a
 * deploy without the bots configured never pays for them, and a decode failure
 * is a null rather than an exception — the flow falls back to typing the code.
 */
export async function decodeQr(bytes: Uint8Array): Promise<string | null> {
  try {
    const [{ default: sharp }, { default: jsQR }] = await Promise.all([
      import("sharp"),
      import("jsqr"),
    ]);
    const { data, info } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const result = jsQR(
      new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      info.width,
      info.height,
    );
    return result?.data?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Resolve a scanned payload — or a code a staff member typed — to a product.
 *
 * One QR per SKU (decision #6): the code identifies the PRODUCT, and the staff
 * member picks the variation at sale time. Accepts the QR payload, the legacy
 * IMS code, or the product id, because a human falling back to typing will
 * reach for whatever is printed on the tag.
 */
export async function resolveProduct(payload: string, showroomKey: string) {
  const value = payload.trim();
  if (!value) return null;
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { qrPayload: value },
        { legacyImsCode: value },
        { legacyImsCode: value.toUpperCase() },
        { id: value },
      ],
    },
    select: {
      id: true,
      name: true,
      price: true,
      status: true,
      variations: {
        where: { active: true },
        select: {
          id: true,
          sku: true,
          label: true,
          price: true,
          stockLevels: {
            where: { showroomKey },
            select: { qty: true },
            take: 1,
          },
        },
        orderBy: { sku: "asc" },
      },
    },
  });
  if (!product) return null;
  return {
    ...product,
    variations: product.variations.map(({ stockLevels, ...variation }) => ({
      ...variation,
      stock: stockLevels[0]?.qty ?? 0,
    })),
  };
}

// ─── Outbound ────────────────────────────────────────────────────────────────

export interface InlineButton {
  text: string;
  data: string;
}

/**
 * Open showrooms as buttons, for a floater who has to say where they are.
 * Shared by both bots so a closed showroom disappears from both at once.
 */
export async function showroomButtons(): Promise<InlineButton[][]> {
  const rooms = await prisma.showroom.findMany({
    where: { ...PHYSICAL_SHOWROOM_WHERE, active: true },
    select: { key: true, name: true },
    orderBy: { position: "asc" },
  });
  return rooms.map((r) => [{ text: r.name, data: `room:${r.key}` }]);
}

/**
 * Send a message. Fire-and-forget by design: the webhook must answer Telegram
 * quickly, and a failed reply must never roll back a recorded sale.
 */
export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
  buttons?: InlineButton[][],
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (buttons?.length) {
    body.reply_markup = {
      inline_keyboard: buttons.map((row) =>
        row.map((b) => ({ text: b.text, callback_data: b.data })),
      ),
    };
  }
  await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => {
    console.error("[telegram] sendMessage failed", {
      chatId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/** Acknowledge a button press so Telegram stops showing its spinner. */
export async function answerCallback(
  botToken: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

/** True when the request really came from Telegram. */
export function verifyWebhookSecret(req: Request): boolean {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  // An unset secret means the webhook is not configured; refuse rather than
  // accept anything, so a half-configured deploy can't be driven by a stranger.
  if (!expected) return false;
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}
