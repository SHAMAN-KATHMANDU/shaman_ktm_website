BEGIN;

-- Session cookies carry this value; bumping it ends every other session.
ALTER TABLE "AdminUser" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

COMMIT;
