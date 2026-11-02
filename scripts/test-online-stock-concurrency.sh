#!/usr/bin/env bash
set -euo pipefail

# Real PostgreSQL race test for the guarded-decrement pattern used by checkout.
admin_url="${ONLINE_STOCK_TEST_ADMIN_URL:-postgresql://postgres@127.0.0.1:5433/postgres}"
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
db_name="h119_race_${$}"
db_url="${admin_url%/*}/$db_name"
cleanup() { dropdb --if-exists --maintenance-db="$admin_url" "$db_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

createdb --maintenance-db="$admin_url" "$db_name"
(cd "$repo_dir" && DATABASE_URL="$db_url" pnpm prisma migrate deploy >/dev/null)
psql "$db_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Product" ("id", "slug", "name", "description", "price", "updatedAt")
VALUES ('race_product', 'race', 'Race', 'Race', 100, CURRENT_TIMESTAMP);
INSERT INTO "ProductVariation" ("id", "productId", "sku", "price", "stock", "attributes")
VALUES ('race_variation', 'race_product', 'RACE-1', 100, 1, '{}');
INSERT INTO "StockLevel" ("id", "variationId", "showroomKey", "qty", "updatedAt")
VALUES ('race_level', 'race_variation', 'online', 1, CURRENT_TIMESTAMP);
SQL

attempt() {
  local movement_id="$1"
  psql "$db_url" -v ON_ERROR_STOP=1 -v movement_id="$movement_id" <<'SQL' >/dev/null
BEGIN;
WITH changed AS (
  UPDATE "StockLevel"
  SET "qty" = "qty" - 1, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "variationId" = 'race_variation'
    AND "showroomKey" = 'online'
    AND "qty" >= 1
  RETURNING 1
)
INSERT INTO "StockMovement" (
  "id", "variationId", "showroomKey", "delta", "reason", "refType", "refId"
)
SELECT :'movement_id', 'race_variation', 'online', -1, 'order', 'Order', :'movement_id'
FROM changed;
COMMIT;
SQL
}

attempt race_a & first_pid=$!
attempt race_b & second_pid=$!
wait "$first_pid"
wait "$second_pid"

[[ "$(psql "$db_url" -Atqc 'SELECT qty FROM "StockLevel" WHERE id = '\''race_level'\''')" == "0" ]]
[[ "$(psql "$db_url" -Atqc 'SELECT count(*) FROM "StockMovement" WHERE "variationId" = '\''race_variation'\''')" == "1" ]]
echo "online stock last-unit race: 2 concurrent attempts, 1 debit, qty 0"
