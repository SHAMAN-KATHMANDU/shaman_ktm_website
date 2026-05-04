-- Add moderation fields to Review.
ALTER TABLE "Review" ADD COLUMN "authorEmail" TEXT;
ALTER TABLE "Review" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "approvedBy" TEXT;

-- Speed up the moderation queue + the public "approved only" lookup.
CREATE INDEX "Review_isApproved_idx" ON "Review"("isApproved");
