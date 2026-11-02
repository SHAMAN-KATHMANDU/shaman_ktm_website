-- PR 8 (leads bot): make the Telegram tables aware of WHICH bot they belong to.
--
-- Telegram reports a private chat's id as the user's own id, identically for
-- every bot, and each bot numbers its messages from 1 within that chat. So the
-- sales bot's message #7 and the leads bot's message #7 arrive as the same
-- (chatId, telegramMessageId) pair. Under PR 7's key, whichever bot spoke
-- second would have its update rejected as an already-handled retry and the
-- staff member would get silence. Sessions had the matching problem: one row
-- per user meant starting a /lead overwrote a scanned-but-unconfirmed /sale.
--
-- Existing rows can only have come from the sales bot (it is the only one that
-- has ever run), so they backfill to 'sales'. The default is dropped afterwards
-- so every future insert has to say which bot it is.

ALTER TABLE "TelegramSession" ADD COLUMN "bot" TEXT NOT NULL DEFAULT 'sales';
ALTER TABLE "TelegramSession" ALTER COLUMN "bot" DROP DEFAULT;

DROP INDEX "TelegramSession_telegramUserId_key";
CREATE UNIQUE INDEX "TelegramSession_bot_telegramUserId_key" ON "TelegramSession"("bot", "telegramUserId");

ALTER TABLE "TelegramUpdate" ADD COLUMN "bot" TEXT NOT NULL DEFAULT 'sales';
ALTER TABLE "TelegramUpdate" ALTER COLUMN "bot" DROP DEFAULT;

DROP INDEX "TelegramUpdate_chatId_telegramMessageId_key";
CREATE UNIQUE INDEX "TelegramUpdate_bot_chatId_telegramMessageId_key" ON "TelegramUpdate"("bot", "chatId", "telegramMessageId");
