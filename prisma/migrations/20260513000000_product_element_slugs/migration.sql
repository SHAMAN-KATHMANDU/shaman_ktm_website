-- AlterTable
ALTER TABLE "Product" ADD COLUMN "elementSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product" SET "elementSlugs" = ARRAY["elementSlug"]::TEXT[] WHERE "elementSlug" IS NOT NULL;

DROP INDEX IF EXISTS "Product_elementSlug_idx";

ALTER TABLE "Product" DROP COLUMN "elementSlug";

CREATE INDEX "Product_elementSlugs_idx" ON "Product" USING GIN ("elementSlugs");
