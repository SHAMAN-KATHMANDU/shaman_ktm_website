-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "saleNo" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "showroomKey" TEXT,
    "customerId" TEXT,
    "b2bAccountId" TEXT,
    "crmLeadId" TEXT,
    "orderId" TEXT,
    "dateAd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateBs" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "paymentMethodId" TEXT,
    "paymentRef" TEXT,
    "paymentEvidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reversesSaleId" TEXT,
    "inputSource" TEXT NOT NULL,
    "enteredByStaffId" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "variationId" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantLabel" TEXT,
    "sku" TEXT,
    "qty" INTEGER NOT NULL,
    "unitMrp" INTEGER,
    "unitPrice" INTEGER NOT NULL,
    "lineDiscount" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleStaff" (
    "saleId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "SaleStaff_pkey" PRIMARY KEY ("saleId","staffId","role")
);

-- CreateTable
CREATE TABLE "SaleCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaleCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleNo_key" ON "Sale"("saleNo");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_orderId_key" ON "Sale"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_reversesSaleId_key" ON "Sale"("reversesSaleId");

-- CreateIndex
CREATE INDEX "Sale_channel_idx" ON "Sale"("channel");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_dateAd_idx" ON "Sale"("dateAd");

-- CreateIndex
CREATE INDEX "Sale_showroomKey_dateAd_idx" ON "Sale"("showroomKey", "dateAd");

-- CreateIndex
CREATE INDEX "Sale_enteredAt_idx" ON "Sale"("enteredAt");

-- CreateIndex
CREATE INDEX "Sale_crmLeadId_idx" ON "Sale"("crmLeadId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "SaleLine_saleId_idx" ON "SaleLine"("saleId");

-- CreateIndex
CREATE INDEX "SaleLine_variationId_idx" ON "SaleLine"("variationId");

-- CreateIndex
CREATE INDEX "SaleLine_productId_idx" ON "SaleLine"("productId");

-- CreateIndex
CREATE INDEX "SaleStaff_staffId_idx" ON "SaleStaff"("staffId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_showroomKey_fkey" FOREIGN KEY ("showroomKey") REFERENCES "Showroom"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethodLookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_reversesSaleId_fkey" FOREIGN KEY ("reversesSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_enteredByStaffId_fkey" FOREIGN KEY ("enteredByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleStaff" ADD CONSTRAINT "SaleStaff_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleStaff" ADD CONSTRAINT "SaleStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

