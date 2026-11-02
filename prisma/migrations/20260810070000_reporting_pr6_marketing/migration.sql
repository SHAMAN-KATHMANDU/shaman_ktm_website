-- CreateTable
CREATE TABLE "FootfallEntry" (
    "id" TEXT NOT NULL,
    "dateAd" TIMESTAMP(3) NOT NULL,
    "dateBs" TEXT NOT NULL,
    "showroomKey" TEXT NOT NULL,
    "visitorsTotal" INTEGER NOT NULL,
    "individuals" INTEGER,
    "groups" INTEGER,
    "source" TEXT NOT NULL,
    "convertedToSale" BOOLEAN NOT NULL DEFAULT false,
    "linkedSaleId" TEXT,
    "enteredByStaffId" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "FootfallEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootfallInquiry" (
    "id" TEXT NOT NULL,
    "footfallEntryId" TEXT NOT NULL,
    "variationId" TEXT,
    "freeTextProduct" TEXT,
    "inquiryType" TEXT NOT NULL,

    CONSTRAINT "FootfallInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMetricsMonthly" (
    "id" TEXT NOT NULL,
    "periodBs" TEXT NOT NULL,
    "periodAd" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "followers" INTEGER,
    "newFollowers" INTEGER,
    "posts" INTEGER,
    "stories" INTEGER,
    "reels" INTEGER,
    "reach" INTEGER,
    "impressions" INTEGER,
    "profileVisits" INTEGER,
    "avgLikes" INTEGER,
    "avgComments" INTEGER,
    "avgSharesSaves" INTEGER,
    "engagementRate" DECIMAL(6,2),
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMetricsMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateBs" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "topic" TEXT,
    "hashtags" TEXT,
    "reach" INTEGER,
    "impressions" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "engagementRate" DECIMAL(6,2),
    "linkClicks" INTEGER,
    "notes" TEXT,
    "enteredByStaffId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpendDaily" (
    "id" TEXT NOT NULL,
    "dateAd" TIMESTAMP(3) NOT NULL,
    "dateBs" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL DEFAULT '',
    "amountSpent" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxRate" DECIMAL(14,6) NOT NULL,
    "amountNpr" INTEGER NOT NULL,
    "impressions" INTEGER,
    "reach" INTEGER,
    "frequency" DECIMAL(8,2),
    "results" INTEGER,
    "costPerResult" DECIMAL(14,2),
    "messagingConversations" INTEGER,
    "source" TEXT NOT NULL,
    "enteredByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpendDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FootfallEntry_showroomKey_dateAd_idx" ON "FootfallEntry"("showroomKey", "dateAd");

-- CreateIndex
CREATE INDEX "FootfallEntry_dateAd_idx" ON "FootfallEntry"("dateAd");

-- CreateIndex
CREATE INDEX "FootfallEntry_source_idx" ON "FootfallEntry"("source");

-- CreateIndex
CREATE INDEX "FootfallEntry_convertedToSale_idx" ON "FootfallEntry"("convertedToSale");

-- CreateIndex
CREATE INDEX "FootfallInquiry_footfallEntryId_idx" ON "FootfallInquiry"("footfallEntryId");

-- CreateIndex
CREATE INDEX "FootfallInquiry_variationId_idx" ON "FootfallInquiry"("variationId");

-- CreateIndex
CREATE INDEX "FootfallInquiry_inquiryType_idx" ON "FootfallInquiry"("inquiryType");

-- CreateIndex
CREATE INDEX "SocialMetricsMonthly_periodAd_idx" ON "SocialMetricsMonthly"("periodAd");

-- CreateIndex
CREATE INDEX "SocialMetricsMonthly_platform_idx" ON "SocialMetricsMonthly"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMetricsMonthly_periodBs_platform_key" ON "SocialMetricsMonthly"("periodBs", "platform");

-- CreateIndex
CREATE INDEX "ContentLog_date_idx" ON "ContentLog"("date");

-- CreateIndex
CREATE INDEX "ContentLog_platform_idx" ON "ContentLog"("platform");

-- CreateIndex
CREATE INDEX "AdSpendDaily_dateAd_idx" ON "AdSpendDaily"("dateAd");

-- CreateIndex
CREATE INDEX "AdSpendDaily_platform_idx" ON "AdSpendDaily"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpendDaily_dateAd_platform_campaignName_key" ON "AdSpendDaily"("dateAd", "platform", "campaignName");

-- AddForeignKey
ALTER TABLE "FootfallEntry" ADD CONSTRAINT "FootfallEntry_showroomKey_fkey" FOREIGN KEY ("showroomKey") REFERENCES "Showroom"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootfallEntry" ADD CONSTRAINT "FootfallEntry_linkedSaleId_fkey" FOREIGN KEY ("linkedSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootfallEntry" ADD CONSTRAINT "FootfallEntry_enteredByStaffId_fkey" FOREIGN KEY ("enteredByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootfallInquiry" ADD CONSTRAINT "FootfallInquiry_footfallEntryId_fkey" FOREIGN KEY ("footfallEntryId") REFERENCES "FootfallEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootfallInquiry" ADD CONSTRAINT "FootfallInquiry_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLog" ADD CONSTRAINT "ContentLog_enteredByStaffId_fkey" FOREIGN KEY ("enteredByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpendDaily" ADD CONSTRAINT "AdSpendDaily_enteredByStaffId_fkey" FOREIGN KEY ("enteredByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

