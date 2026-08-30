-- The existing ProductVariation.stock column was the only online-sale balance
-- before the per-location ledger shipped. Production has no StockLevel rows at
-- this point, so copying that value into the new Online pool preserves today's
-- sellable quantity exactly while moving authority into the ledger.
--
-- DEPLOYMENT CONTRACT: this migration is safe only during the normal
-- Watchtower replacement, after the old application writer has stopped and
-- before the new server starts. Do not run it manually while the old app is
-- accepting orders.

-- Fail closed if the production assumptions have changed. The first deploy
-- has one unambiguous meaning: the globally empty location ledger is seeded
-- from the aggregate balance, and the reserved key is absent (or is the exact
-- pool this migration created during an earlier successful run).
DO $$
DECLARE
  existing_online "Showroom"%ROWTYPE;
BEGIN
  SELECT * INTO existing_online FROM "Showroom" WHERE "key" = 'online';

  IF FOUND AND (
    existing_online."name" <> 'Online'
    OR existing_online."address" <> 'Online fulfilment pool'
    OR existing_online."whatsapp" <> 'N/A'
    OR existing_online."position" <> 2147483647
    OR existing_online."type" <> 'warehouse'
    OR existing_online."active" IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'reserved showroom key online exists with an unexpected definition';
  END IF;

  IF EXISTS (SELECT 1 FROM "StockLevel") AND NOT FOUND THEN
    RAISE EXCEPTION 'online stock cutover requires a globally empty StockLevel ledger';
  END IF;
END $$;

-- Prevent a concurrent legacy checkout from changing the snapshot while it is
-- copied. This does not make a live manual migration safe; see contract above.
LOCK TABLE "ProductVariation" IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO "Showroom" (
  "key", "name", "address", "whatsapp", "position", "type", "active", "updatedAt"
)
VALUES (
  'online', 'Online', 'Online fulfilment pool', 'N/A', 2147483647,
  'warehouse', true, CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET "key" = EXCLUDED."key";

-- Audit every non-zero opening balance. Prisma's cuid() is client-side, so the
-- migration uses deterministic ids derived from the variation id.
INSERT INTO "StockMovement" (
  "id", "variationId", "showroomKey", "delta", "reason", "note", "createdAt"
)
SELECT
  'online_seed_' || md5(v."id"),
  v."id",
  'online',
  v."stock",
  'initial_seed',
  'Migrated pre-ledger online balance',
  CURRENT_TIMESTAMP
FROM "ProductVariation" v
WHERE v."stock" <> 0
  AND NOT EXISTS (
    SELECT 1 FROM "StockLevel" existing
    WHERE existing."showroomKey" = 'online'
  );

-- A row exists even for zero stock: absence always means unavailable and must
-- never trigger a lazy copy from the aggregate balance.
INSERT INTO "StockLevel" (
  "id", "variationId", "showroomKey", "qty", "updatedAt"
)
SELECT
  'online_level_' || md5(v."id"),
  v."id",
  'online',
  v."stock",
  CURRENT_TIMESTAMP
FROM "ProductVariation" v
ON CONFLICT ("variationId", "showroomKey") DO NOTHING;
