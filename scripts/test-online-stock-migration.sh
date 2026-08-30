#!/usr/bin/env bash
set -euo pipefail

# Real PostgreSQL contract tests for the Online cutover migration. This creates
# isolated temporary databases only; pass a trusted local admin URL whose
# database component is `postgres`.
admin_url="${ONLINE_STOCK_TEST_ADMIN_URL:-postgresql://postgres@127.0.0.1:5433/postgres}"
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
migration="$repo_dir/prisma/migrations/20260830144500_online_stock_pool/migration.sql"
db_prefix="h119_sql_${$}"

cleanup() {
  for suffix in success physical partial wrong; do
    dropdb --if-exists --maintenance-db="$admin_url" "${db_prefix}_${suffix}" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

bootstrap() {
  local suffix="$1"
  local db_name="${db_prefix}_${suffix}"
  createdb --maintenance-db="$admin_url" "$db_name"
  local db_url="${admin_url%/*}/$db_name"
  for dir in "$repo_dir"/prisma/migrations/*; do
    [[ -d "$dir" ]] || continue
    [[ "$(basename "$dir")" == "20260830144500_online_stock_pool" ]] && continue
    psql "$db_url" -v ON_ERROR_STOP=1 -f "$dir/migration.sql" >/dev/null
  done
  psql "$db_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Product" ("id", "slug", "name", "description", "price", "updatedAt")
VALUES ('product_test', 'test', 'Test', 'Test', 100, CURRENT_TIMESTAMP);
INSERT INTO "ProductVariation" ("id", "productId", "sku", "price", "stock", "attributes")
VALUES
  ('variation_positive', 'product_test', 'TEST-POS', 100, 5, '{}'),
  ('variation_zero', 'product_test', 'TEST-ZERO', 100, 0, '{}');
SQL
  printf '%s' "$db_url"
}

expect_failure() {
  local db_url="$1"
  local message="$2"
  if psql "$db_url" -1 -v ON_ERROR_STOP=1 -f "$migration" >"/tmp/${db_prefix}.out" 2>&1; then
    echo "expected migration failure: $message" >&2
    exit 1
  fi
  rg -q "$message" "/tmp/${db_prefix}.out"
}

# 1/2/3: empty first run, exact rerun, and zero stock => level/no movement.
success_url="$(bootstrap success)"
psql "$success_url" -1 -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
[[ "$(psql "$success_url" -Atqc 'SELECT count(*) FROM "StockLevel"')" == "2" ]]
[[ "$(psql "$success_url" -Atqc 'SELECT count(*) FROM "StockMovement"')" == "1" ]]
[[ "$(psql "$success_url" -Atqc 'SELECT qty FROM "StockLevel" WHERE "variationId" = '\''variation_zero'\''')" == "0" ]]
[[ "$(psql "$success_url" -Atqc 'SELECT count(*) FROM "StockMovement" WHERE "variationId" = '\''variation_zero'\''')" == "0" ]]
psql "$success_url" -1 -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
[[ "$(psql "$success_url" -Atqc 'SELECT count(*) FROM "StockLevel"')" == "2" ]]
[[ "$(psql "$success_url" -Atqc 'SELECT count(*) FROM "StockMovement"')" == "1" ]]

# 4: correct pool row plus a physical-only ledger is not a completed cutover.
physical_url="$(bootstrap physical)"
psql "$physical_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Showroom" ("key","name","address","whatsapp","position","type","active","updatedAt")
VALUES ('online','Online','Online fulfilment pool','N/A',2147483647,'warehouse',true,CURRENT_TIMESTAMP),
       ('thamel','Thamel','Thamel','N/A',0,'showroom',true,CURRENT_TIMESTAMP);
INSERT INTO "StockLevel" ("id","variationId","showroomKey","qty","updatedAt")
VALUES ('physical_level','variation_positive','thamel',5,CURRENT_TIMESTAMP);
SQL
expect_failure "$physical_url" "partial or mixed StockLevel ledger"

# 5: partial Online coverage is not a completed rerun.
partial_url="$(bootstrap partial)"
psql "$partial_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Showroom" ("key","name","address","whatsapp","position","type","active","updatedAt")
VALUES ('online','Online','Online fulfilment pool','N/A',2147483647,'warehouse',true,CURRENT_TIMESTAMP);
INSERT INTO "StockLevel" ("id","variationId","showroomKey","qty","updatedAt")
VALUES ('partial_level','variation_positive','online',5,CURRENT_TIMESTAMP);
SQL
expect_failure "$partial_url" "partial or mixed StockLevel ledger"

# 6: a customer-facing or otherwise mismatched reserved key fails closed.
wrong_url="$(bootstrap wrong)"
psql "$wrong_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Showroom" ("key","name","address","whatsapp","position","type","active","updatedAt")
VALUES ('online','Customer Online Shop','Kathmandu','N/A',0,'showroom',true,CURRENT_TIMESTAMP);
SQL
expect_failure "$wrong_url" "unexpected definition"

rm -f "/tmp/${db_prefix}.out"
echo "online stock migration SQL scenarios: 6 passed"
