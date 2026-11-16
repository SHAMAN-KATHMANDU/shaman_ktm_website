BEGIN;

-- Ties each MCP token to the admin it acts as, so its role can be capped at
-- that admin's current role and it dies with them.
ALTER TABLE "McpToken" ADD COLUMN "createdByUserId" TEXT;

-- Backfill from the creator email recorded at the time. Tokens whose creator
-- no longer exists stay NULL (legacy: they keep their stored role).
UPDATE "McpToken" t
SET "createdByUserId" = a."id"
FROM "AdminUser" a
WHERE a."email" = t."createdBy" AND t."createdByUserId" IS NULL;

COMMIT;
