-- PR 4a (delivery log): record what actually happens to a parcel.
--
-- Note what is NOT here: a second status column. Order.status stays the single
-- customer-facing state; how far the parcel has got is the latest DeliveryEvent.
-- Two status columns on one row would eventually disagree, and then nobody
-- could say which was true.
--
-- The columns added to "Order" are MATERIALIZED from the log by
-- recordDeliveryEvent() — the same relationship StockLevel has to
-- StockMovement. They exist so the admin list can filter without walking every
-- event; nothing else writes them.
--
-- "dateBs" is nullable and left null on historical orders: it is a real
-- conversion, not something SQL can compute, and backfilling it with a guess
-- would put wrong dates in a report. New orders get it at creation, and
-- scripts/backfill-order-bs.mts fills the history when someone chooses to run
-- it.

ALTER TABLE "Order" ADD COLUMN "courierId" TEXT;
ALTER TABLE "Order" ADD COLUMN "courierTrackingRef" TEXT;
ALTER TABLE "Order" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "codAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "deliveryLandmark" TEXT;
ALTER TABLE "Order" ADD COLUMN "recipientPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "packedByStaffId" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveredByStaffId" TEXT;
ALTER TABLE "Order" ADD COLUMN "dateBs" TEXT;

CREATE INDEX "Order_courierId_idx" ON "Order"("courierId");
CREATE INDEX "Order_dispatchedAt_idx" ON "Order"("dispatchedAt");
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_packedByStaffId_fkey"
  FOREIGN KEY ("packedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveredByStaffId_fkey"
  FOREIGN KEY ("deliveredByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "courierId" TEXT,
    "trackingRef" TEXT,
    "codCollected" INTEGER,
    "landmark" TEXT,
    "recipientPhone" TEXT,
    "staffId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateBs" TEXT NOT NULL,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryEvent_orderId_createdAt_idx" ON "DeliveryEvent"("orderId", "createdAt");
CREATE INDEX "DeliveryEvent_event_idx" ON "DeliveryEvent"("event");
CREATE INDEX "DeliveryEvent_createdAt_idx" ON "DeliveryEvent"("createdAt");
CREATE INDEX "DeliveryEvent_staffId_idx" ON "DeliveryEvent"("staffId");
CREATE INDEX "DeliveryEvent_courierId_idx" ON "DeliveryEvent"("courierId");

ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
