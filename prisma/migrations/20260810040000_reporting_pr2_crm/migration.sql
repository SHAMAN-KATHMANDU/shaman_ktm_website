-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneAlt" TEXT,
    "email" TEXT,
    "sourceId" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "askedLocation" BOOLEAN NOT NULL DEFAULT false,
    "willVisit" BOOLEAN NOT NULL DEFAULT false,
    "visitDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "assignedStaffId" TEXT,
    "showroomKey" TEXT,
    "linkedSaleId" TEXT,
    "linkedB2bAccountId" TEXT,
    "notes" TEXT,
    "evidenceUrl" TEXT,
    "createdByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLeadStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedByStaffId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmLeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFollowup" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "followupAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "gotResponse" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmFollowup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmLead_status_idx" ON "CrmLead"("status");

-- CreateIndex
CREATE INDEX "CrmLead_interest_idx" ON "CrmLead"("interest");

-- CreateIndex
CREATE INDEX "CrmLead_sourceId_idx" ON "CrmLead"("sourceId");

-- CreateIndex
CREATE INDEX "CrmLead_createdAt_idx" ON "CrmLead"("createdAt");

-- CreateIndex
CREATE INDEX "CrmLead_showroomKey_idx" ON "CrmLead"("showroomKey");

-- CreateIndex
CREATE INDEX "CrmLead_assignedStaffId_idx" ON "CrmLead"("assignedStaffId");

-- CreateIndex
CREATE INDEX "CrmLead_followUpDate_idx" ON "CrmLead"("followUpDate");

-- CreateIndex
CREATE INDEX "CrmLead_phone_idx" ON "CrmLead"("phone");

-- CreateIndex
CREATE INDEX "CrmLeadStatusHistory_leadId_createdAt_idx" ON "CrmLeadStatusHistory"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmLeadStatusHistory_createdAt_idx" ON "CrmLeadStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "CrmFollowup_leadId_followupAt_idx" ON "CrmFollowup"("leadId", "followupAt");

-- CreateIndex
CREATE INDEX "CrmFollowup_staffId_idx" ON "CrmFollowup"("staffId");

-- CreateIndex
CREATE INDEX "CrmFollowup_followupAt_idx" ON "CrmFollowup"("followupAt");

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_showroomKey_fkey" FOREIGN KEY ("showroomKey") REFERENCES "Showroom"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadStatusHistory" ADD CONSTRAINT "CrmLeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLeadStatusHistory" ADD CONSTRAINT "CrmLeadStatusHistory_changedByStaffId_fkey" FOREIGN KEY ("changedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFollowup" ADD CONSTRAINT "CrmFollowup_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFollowup" ADD CONSTRAINT "CrmFollowup_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

