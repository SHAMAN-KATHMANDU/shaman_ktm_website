-- Give OrderItem the foreign keys it never had.
--
-- Until now productId and variationId were bare strings, so deleting a product
-- left order lines pointing at nothing — a hole in the sales history, and the
-- same dangling-pointer class already fixed on the Sale side (#92). SaleLine has
-- carried real keys with Restrict from the start; order lines are the same kind
-- of record and should be protected the same way.
--
-- ADDED "NOT VALID" DELIBERATELY. Migrations run in the container entrypoint on
-- deploy, so a constraint that fails on pre-existing data takes the site down —
-- that is the shape of the outage that cost eight days in August. NOT VALID
-- applies the constraint to every future insert and update while skipping the
-- one-time check of existing rows, so this migration cannot fail whatever is in
-- the table today.
--
-- To finish the job once production data has been checked:
--
--   SELECT COUNT(*) FROM "OrderItem" oi
--     LEFT JOIN "Product" p ON p.id = oi."productId"
--    WHERE p.id IS NULL;
--
--   -- if that returns 0:
--   ALTER TABLE "OrderItem" VALIDATE CONSTRAINT "OrderItem_productId_fkey";
--   ALTER TABLE "OrderItem" VALIDATE CONSTRAINT "OrderItem_variationId_fkey";
--
-- Behaviour change worth knowing: deleting a product that has been ordered is
-- now refused rather than silently orphaning the order line. That is correct for
-- a system of record — archive the product instead (status = archived), which
-- hides it from the shop and keeps the history intact.

CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderItem_variationId_idx" ON "OrderItem"("variationId");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variationId_fkey"
  FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
