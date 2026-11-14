BEGIN;

ALTER TABLE "OrderItem" ADD COLUMN "stockDebited" BOOLEAN NOT NULL DEFAULT false;

-- Mark only variation lines whose checkout debit is actually in the ledger,
-- so a later return never credits stock that was never taken. Product-level
-- lines stay false: whether the product tracked stock then is unknown.
UPDATE "OrderItem" oi SET "stockDebited" = true
WHERE oi."variationId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "StockMovement" m
    WHERE m."refType" = 'Order'
      AND m."refId" = oi."orderId"
      AND m."variationId" = oi."variationId"
      AND m."reason" = 'order'
  );

COMMIT;
