-- Role-based access control for the CMS admin.
ALTER TABLE "AdminUser" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'editor';
ALTER TABLE "AdminUser" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "AdminUser" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Promote the first admin (bootstrap account) to owner so user management
-- isn't immediately locked out after this migration runs.
UPDATE "AdminUser"
SET "role" = 'owner'
WHERE id = (SELECT id FROM "AdminUser" ORDER BY "createdAt" ASC LIMIT 1);
