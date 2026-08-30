-- Ledger rows must outlive their catalog entities. This database constraint
-- closes the race between checking for history and deleting a product.
ALTER TABLE "StockMovement"
DROP CONSTRAINT "StockMovement_variationId_fkey",
ADD CONSTRAINT "StockMovement_variationId_fkey"
FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
