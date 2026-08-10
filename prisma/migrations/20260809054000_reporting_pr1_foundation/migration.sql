-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "role" SET DEFAULT 'staff';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "legacyImsCode" TEXT,
ADD COLUMN     "moq" INTEGER,
ADD COLUMN     "qrPayload" TEXT,
ADD COLUMN     "wholesaleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wholesalePrice" INTEGER;

-- AlterTable
ALTER TABLE "ProductVariation" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "costPrice" INTEGER,
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "mrp" INTEGER,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "wholesalePrice" INTEGER;

-- AlterTable
ALTER TABLE "Showroom" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'showroom';

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "adminUserId" TEXT,
    "telegramUserId" TEXT,
    "defaultShowroomKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodLookup" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentMethodLookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "showroomKey" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "showroomKey" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "staffId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_adminUserId_key" ON "Staff"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_telegramUserId_key" ON "Staff"("telegramUserId");

-- CreateIndex
CREATE INDEX "Staff_telegramUserId_idx" ON "Staff"("telegramUserId");

-- CreateIndex
CREATE INDEX "Staff_active_idx" ON "Staff"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodLookup_label_key" ON "PaymentMethodLookup"("label");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_label_key" ON "LeadSource"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Courier_label_key" ON "Courier"("label");

-- CreateIndex
CREATE INDEX "StockLevel_showroomKey_idx" ON "StockLevel"("showroomKey");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_variationId_showroomKey_key" ON "StockLevel"("variationId", "showroomKey");

-- CreateIndex
CREATE INDEX "StockMovement_variationId_showroomKey_createdAt_idx" ON "StockMovement"("variationId", "showroomKey", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_reason_idx" ON "StockMovement"("reason");

-- CreateIndex
CREATE INDEX "StockMovement_staffId_idx" ON "StockMovement"("staffId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_legacyImsCode_key" ON "Product"("legacyImsCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_qrPayload_key" ON "Product"("qrPayload");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_defaultShowroomKey_fkey" FOREIGN KEY ("defaultShowroomKey") REFERENCES "Showroom"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_showroomKey_fkey" FOREIGN KEY ("showroomKey") REFERENCES "Showroom"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_showroomKey_fkey" FOREIGN KEY ("showroomKey") REFERENCES "Showroom"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

