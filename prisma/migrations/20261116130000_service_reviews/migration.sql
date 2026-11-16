-- Reviews can belong to a service (e.g. Sound Healing) as well as a product,
-- and record where they came from (website form or a staff-entered testimonial).
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN "serviceSlug" TEXT;
ALTER TABLE "Review" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'website';

CREATE INDEX "Review_serviceSlug_idx" ON "Review"("serviceSlug");

ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceSlug_fkey"
  FOREIGN KEY ("serviceSlug") REFERENCES "Service"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one target per review.
ALTER TABLE "Review" ADD CONSTRAINT "Review_one_target_chk"
  CHECK (("productId" IS NULL) <> ("serviceSlug" IS NULL));
