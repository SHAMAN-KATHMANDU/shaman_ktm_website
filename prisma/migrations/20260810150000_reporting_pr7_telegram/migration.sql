-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramUpdate" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "telegramMessageId" INTEGER NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_telegramUserId_key" ON "TelegramSession"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramSession_expiresAt_idx" ON "TelegramSession"("expiresAt");

-- CreateIndex
CREATE INDEX "TelegramUpdate_telegramUserId_idx" ON "TelegramUpdate"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramUpdate_createdAt_idx" ON "TelegramUpdate"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUpdate_chatId_telegramMessageId_key" ON "TelegramUpdate"("chatId", "telegramMessageId");

