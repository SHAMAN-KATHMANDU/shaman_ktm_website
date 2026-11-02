-- Per-variation product photos.
--
-- Additive and nullable on purpose: docker/entrypoint.sh runs
-- `prisma migrate deploy` at container start, so during a rolling swap the
-- OLD container is briefly serving against a schema that already has this
-- column. A nullable ADD COLUMN is invisible to it.
--
-- ON DELETE SET NULL is deliberate: deleting a variation demotes its photos
-- back to the product gallery. It must never destroy an uploaded image.
--
-- Statements below are exactly what `prisma migrate diff` generates for this
-- schema change, in its order.

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "variationId" TEXT;

-- CreateIndex
CREATE INDEX "ProductImage_variationId_idx" ON "ProductImage"("variationId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
