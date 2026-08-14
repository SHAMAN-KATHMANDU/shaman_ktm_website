-- CreateTable
CREATE TABLE "B2bTier" (
    "tier" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "minOrderValue" INTEGER NOT NULL,
    "maxOrderValue" INTEGER,
    "discountPct" INTEGER NOT NULL,
    "targetMarginPct" INTEGER NOT NULL,
    "commissionPct" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "B2bTier_pkey" PRIMARY KEY ("tier")
);

-- CreateTable
CREATE TABLE "B2bAccount" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "panNo" TEXT,
    "accountType" TEXT NOT NULL,
    "tier" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "ownerStaffId" TEXT,
    "sourceCrmLeadId" TEXT,
    "showroomKey" TEXT,
    "notes" TEXT,
    "createdByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2bAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bDeal" (
    "id" TEXT NOT NULL,
    "b2bAccountId" TEXT NOT NULL,
    "dealName" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'contacted',
    "quoteAmount" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "ownerStaffId" TEXT,
    "tierApplied" INTEGER,
    "linkedSaleId" TEXT,
    "dateAd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateBs" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2bDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bDealStageHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedByStaffId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bDealStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bQuoteLine" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "productName" TEXT NOT NULL,
    "variantLabel" TEXT,
    "sku" TEXT,
    "qty" INTEGER NOT NULL,
    "mrp" INTEGER NOT NULL,
    "wholesaleRate" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "costPrice" INTEGER,
    "lineTotalMrp" INTEGER NOT NULL,
    "lineTotalWholesale" INTEGER NOT NULL,
    "marginAmount" INTEGER,
    "marginPct" INTEGER,
    "note" TEXT,

    CONSTRAINT "B2bQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bPayment" (
    "id" TEXT NOT NULL,
    "b2bAccountId" TEXT NOT NULL,
    "saleId" TEXT,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateBs" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "isAdvance" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT,
    "note" TEXT,
    "recordedByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2bPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "B2bTier_label_key" ON "B2bTier"("label");

-- CreateIndex
CREATE INDEX "B2bAccount_status_idx" ON "B2bAccount"("status");

-- CreateIndex
CREATE INDEX "B2bAccount_accountType_idx" ON "B2bAccount"("accountType");

-- CreateIndex
CREATE INDEX "B2bAccount_tier_idx" ON "B2bAccount"("tier");

-- CreateIndex
CREATE INDEX "B2bAccount_ownerStaffId_idx" ON "B2bAccount"("ownerStaffId");

-- CreateIndex
CREATE INDEX "B2bAccount_createdAt_idx" ON "B2bAccount"("createdAt");

-- CreateIndex
CREATE INDEX "B2bDeal_b2bAccountId_idx" ON "B2bDeal"("b2bAccountId");

-- CreateIndex
CREATE INDEX "B2bDeal_stage_idx" ON "B2bDeal"("stage");

-- CreateIndex
CREATE INDEX "B2bDeal_ownerStaffId_idx" ON "B2bDeal"("ownerStaffId");

-- CreateIndex
CREATE INDEX "B2bDeal_expectedCloseDate_idx" ON "B2bDeal"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "B2bDeal_dateAd_idx" ON "B2bDeal"("dateAd");

-- CreateIndex
CREATE INDEX "B2bDealStageHistory_dealId_createdAt_idx" ON "B2bDealStageHistory"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "B2bDealStageHistory_createdAt_idx" ON "B2bDealStageHistory"("createdAt");

-- CreateIndex
CREATE INDEX "B2bQuoteLine_dealId_idx" ON "B2bQuoteLine"("dealId");

-- CreateIndex
CREATE INDEX "B2bQuoteLine_productId_idx" ON "B2bQuoteLine"("productId");

-- CreateIndex
CREATE INDEX "B2bQuoteLine_variationId_idx" ON "B2bQuoteLine"("variationId");

-- CreateIndex
CREATE INDEX "B2bPayment_b2bAccountId_paidAt_idx" ON "B2bPayment"("b2bAccountId", "paidAt");

-- CreateIndex
CREATE INDEX "B2bPayment_saleId_idx" ON "B2bPayment"("saleId");

-- CreateIndex
CREATE INDEX "B2bPayment_paidAt_idx" ON "B2bPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_linkedB2bAccountId_fkey" FOREIGN KEY ("linkedB2bAccountId") REFERENCES "B2bAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_b2bAccountId_fkey" FOREIGN KEY ("b2bAccountId") REFERENCES "B2bAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bAccount" ADD CONSTRAINT "B2bAccount_tier_fkey" FOREIGN KEY ("tier") REFERENCES "B2bTier"("tier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bAccount" ADD CONSTRAINT "B2bAccount_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bAccount" ADD CONSTRAINT "B2bAccount_sourceCrmLeadId_fkey" FOREIGN KEY ("sourceCrmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bAccount" ADD CONSTRAINT "B2bAccount_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bDeal" ADD CONSTRAINT "B2bDeal_b2bAccountId_fkey" FOREIGN KEY ("b2bAccountId") REFERENCES "B2bAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bDeal" ADD CONSTRAINT "B2bDeal_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bDeal" ADD CONSTRAINT "B2bDeal_tierApplied_fkey" FOREIGN KEY ("tierApplied") REFERENCES "B2bTier"("tier") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bDealStageHistory" ADD CONSTRAINT "B2bDealStageHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "B2bDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bDealStageHistory" ADD CONSTRAINT "B2bDealStageHistory_changedByStaffId_fkey" FOREIGN KEY ("changedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bQuoteLine" ADD CONSTRAINT "B2bQuoteLine_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "B2bDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bQuoteLine" ADD CONSTRAINT "B2bQuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bQuoteLine" ADD CONSTRAINT "B2bQuoteLine_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bPayment" ADD CONSTRAINT "B2bPayment_b2bAccountId_fkey" FOREIGN KEY ("b2bAccountId") REFERENCES "B2bAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bPayment" ADD CONSTRAINT "B2bPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethodLookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bPayment" ADD CONSTRAINT "B2bPayment_recordedByStaffId_fkey" FOREIGN KEY ("recordedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

