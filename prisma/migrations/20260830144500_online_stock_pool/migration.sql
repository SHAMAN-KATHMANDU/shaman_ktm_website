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
  online_exists boolean;
  level_count bigint;
  movement_count bigint;
  variation_count bigint;
  online_level_count bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "Showroom" WHERE "key" = 'online'
  ) INTO online_exists;

  IF online_exists THEN
    SELECT * INTO STRICT existing_online
    FROM "Showroom" WHERE "key" = 'online';
    IF existing_online."name" IS DISTINCT FROM 'Online'
      OR existing_online."address" IS DISTINCT FROM 'Online fulfilment pool'
      OR existing_online."whatsapp" IS DISTINCT FROM 'N/A'
      OR existing_online."position" IS DISTINCT FROM 2147483647
      OR existing_online."type" IS DISTINCT FROM 'warehouse'
      OR existing_online."active" IS DISTINCT FROM true
    THEN
      RAISE EXCEPTION 'reserved showroom key online exists with an unexpected definition';
    END IF;
  END IF;

  SELECT count(*) INTO level_count FROM "StockLevel";
  SELECT count(*) INTO movement_count FROM "StockMovement";
  SELECT count(*) INTO variation_count FROM "ProductVariation";
  SELECT count(*) INTO online_level_count
  FROM "StockLevel" WHERE "showroomKey" = 'online';

  IF level_count = 0 THEN
    IF movement_count <> 0 THEN
      RAISE EXCEPTION 'online stock first deploy requires an empty StockMovement ledger';
    END IF;
  ELSIF NOT online_exists
    OR online_level_count <> variation_count
    OR EXISTS (
      SELECT 1
      FROM "ProductVariation" v
      LEFT JOIN "StockLevel" level
        ON level."variationId" = v."id"
       AND level."showroomKey" = 'online'
      WHERE level."id" IS NULL
    )
  THEN
    RAISE EXCEPTION 'online stock cutover found a partial or mixed StockLevel ledger';
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

-- A correction may reverse a movement only once, regardless of which future
-- API/webhook path attempts it. Transfers intentionally share refIds, so this
-- is a partial invariant scoped to correction rows.
CREATE UNIQUE INDEX IF NOT EXISTS "StockMovement_one_correction_per_original"
ON "StockMovement" ("refId")
WHERE "reason" = 'correction'
  AND "refType" = 'StockMovement'
  AND "refId" IS NOT NULL;

-- Cancellation restores one debit per order × variation. Refuse ambiguous
-- legacy carts instead of synthesising rows the cancellation path cannot
-- reverse safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OrderItem" item
    JOIN "Order" customer_order ON customer_order."id" = item."orderId"
    WHERE item."variationId" IS NOT NULL
      AND customer_order."status" IN ('pending', 'confirmed', 'shipped')
    GROUP BY item."orderId", item."variationId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'online stock cutover found duplicate open order variation rows';
  END IF;
END $$;

-- Old-code orders already reduced ProductVariation.stock but have no ledger
-- debit. Reconstruct outstanding pending/confirmed/shipped debits for ledger
-- reconciliation; pending/confirmed can later append the same exact-once
-- cancellation correction as a new order.
INSERT INTO "StockMovement" (
  "id", "variationId", "showroomKey", "delta", "reason",
  "refType", "refId", "note", "createdAt"
)
SELECT
  'legacy_order_' || md5(item."id"),
  item."variationId",
  'online',
  -item."quantity",
  'order',
  'Order',
  item."orderId",
  'Reconstructed open order debit during Online cutover',
  CURRENT_TIMESTAMP
FROM "OrderItem" item
JOIN "Order" customer_order ON customer_order."id" = item."orderId"
WHERE item."variationId" IS NOT NULL
  AND customer_order."status" IN ('pending', 'confirmed', 'shipped')
  AND NOT EXISTS (
    SELECT 1 FROM "StockLevel" existing
    WHERE existing."showroomKey" = 'online'
  )
ON CONFLICT ("id") DO NOTHING;

-- Audit every non-zero opening balance. Prisma's cuid() is client-side, so the
-- migration uses deterministic ids derived from the variation id.
INSERT INTO "StockMovement" (
  "id", "variationId", "showroomKey", "delta", "reason", "note", "createdAt"
)
SELECT
  'online_seed_' || md5(v."id"),
  v."id",
  'online',
  v."stock" + COALESCE(open_orders."qty", 0),
  'initial_seed',
  'Migrated pre-ledger online balance',
  CURRENT_TIMESTAMP
FROM "ProductVariation" v
LEFT JOIN (
  SELECT item."variationId", sum(item."quantity")::integer AS "qty"
  FROM "OrderItem" item
  JOIN "Order" customer_order ON customer_order."id" = item."orderId"
  WHERE item."variationId" IS NOT NULL
    AND customer_order."status" IN ('pending', 'confirmed', 'shipped')
  GROUP BY item."variationId"
) open_orders ON open_orders."variationId" = v."id"
WHERE v."stock" + COALESCE(open_orders."qty", 0) <> 0
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
