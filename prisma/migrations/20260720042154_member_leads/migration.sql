-- CreateTable
CREATE TABLE "MemberLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT NOT NULL DEFAULT 'homepage-member-circle',
    "status" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberLead_status_idx" ON "MemberLead"("status");

-- CreateIndex
CREATE INDEX "MemberLead_createdAt_idx" ON "MemberLead"("createdAt");
