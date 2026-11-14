BEGIN;

ALTER TABLE "OrderItem" ADD COLUMN "stockDebited" BOOLEAN NOT NULL DEFAULT false;

-- Variation lines always took Online-pool stock at checkout. Product-level
-- lines are left false: whether the product tracked stock then is unknown, and
-- restoring stock that was never taken would inflate it.
UPDATE "OrderItem" SET "stockDebited" = true WHERE "variationId" IS NOT NULL;

COMMIT;
