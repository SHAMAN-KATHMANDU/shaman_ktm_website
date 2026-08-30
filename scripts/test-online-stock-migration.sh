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
  for suffix in success legacy duplicate physical partial wrong; do
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

# 4: legacy open orders are reconstructed, closed orders are excluded, and a
# rerun duplicates neither opening seeds nor order debits.
legacy_url="$(bootstrap legacy)"
psql "$legacy_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Customer" ("id","email","passwordHash","name","updatedAt")
VALUES ('customer_test','test@example.com','hash','Test',CURRENT_TIMESTAMP);
INSERT INTO "Order" (
  "id","number","customerId","subtotal","total","status","deliveryName",
  "deliveryPhone","deliveryAddress","deliveryZone","updatedAt"
) VALUES
  ('order_pending','SK-PENDING','customer_test',100,100,'pending','Test','9800000000','Kathmandu','shipping',CURRENT_TIMESTAMP),
  ('order_confirmed','SK-CONFIRMED','customer_test',200,200,'confirmed','Test','9800000000','Kathmandu','shipping',CURRENT_TIMESTAMP),
  ('order_shipped','SK-SHIPPED','customer_test',300,300,'shipped','Test','9800000000','Kathmandu','shipping',CURRENT_TIMESTAMP),
  ('order_cancelled','SK-CANCELLED','customer_test',400,400,'cancelled','Test','9800000000','Kathmandu','shipping',CURRENT_TIMESTAMP),
  ('order_delivered','SK-DELIVERED','customer_test',500,500,'delivered','Test','9800000000','Kathmandu','shipping',CURRENT_TIMESTAMP);
INSERT INTO "OrderItem" (
  "id","orderId","productId","productSlug","productName","variationId",
  "variationSku","quantity","priceAtOrder"
) VALUES
  ('item_pending','order_pending','product_test','test','Test','variation_positive','TEST-POS',1,100),
  ('item_confirmed','order_confirmed','product_test','test','Test','variation_positive','TEST-POS',2,100),
  ('item_shipped','order_shipped','product_test','test','Test','variation_positive','TEST-POS',3,100),
  ('item_cancelled','order_cancelled','product_test','test','Test','variation_positive','TEST-POS',4,100),
  ('item_delivered','order_delivered','product_test','test','Test','variation_positive','TEST-POS',5,100);
SQL
psql "$legacy_url" -1 -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
[[ "$(psql "$legacy_url" -Atqc 'SELECT qty FROM "StockLevel" WHERE "variationId" = '\''variation_positive'\''')" == "5" ]]
[[ "$(psql "$legacy_url" -Atqc 'SELECT COALESCE(sum(delta),0) FROM "StockMovement" WHERE "variationId" = '\''variation_positive'\''')" == "5" ]]
[[ "$(psql "$legacy_url" -Atqc 'SELECT delta FROM "StockMovement" WHERE "variationId" = '\''variation_positive'\'' AND reason = '\''initial_seed'\''')" == "11" ]]
[[ "$(psql "$legacy_url" -Atqc 'SELECT count(*) || '\''|'\'' || sum(delta) FROM "StockMovement" WHERE reason = '\''order'\''')" == "3|-6" ]]
[[ "$(psql "$legacy_url" -Atqc 'SELECT count(*) FROM "StockMovement" WHERE "refId" IN ('\''order_cancelled'\'', '\''order_delivered'\'')')" == "0" ]]
psql "$legacy_url" -1 -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
[[ "$(psql "$legacy_url" -Atqc 'SELECT count(*) FROM "StockMovement"')" == "4" ]]

# 5: duplicate variation rows in one open legacy order fail closed because the
# cancellation service restores exactly one debit per order × variation.
duplicate_url="$(bootstrap duplicate)"
psql "$duplicate_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Customer" ("id","email","passwordHash","name","updatedAt")
VALUES ('customer_test','duplicate@example.com','hash','Test',CURRENT_TIMESTAMP);
INSERT INTO "Order" (
  "id","number","customerId","subtotal","total","status","deliveryName",
  "deliveryPhone","deliveryAddress","deliveryZone","updatedAt"
) VALUES ('order_duplicate','SK-DUPLICATE','customer_test',200,200,'pending','Test','9800000000','Kathmandu','shipping',CURRENT_TIMESTAMP);
INSERT INTO "OrderItem" (
  "id","orderId","productId","productSlug","productName","variationId",
  "variationSku","quantity","priceAtOrder"
) VALUES
  ('item_duplicate_a','order_duplicate','product_test','test','Test','variation_positive','TEST-POS',1,100),
  ('item_duplicate_b','order_duplicate','product_test','test','Test','variation_positive','TEST-POS',1,100);
SQL
expect_failure "$duplicate_url" "duplicate open order variation rows"

# 6: correct pool row plus a physical-only ledger is not a completed cutover.
physical_url="$(bootstrap physical)"
psql "$physical_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Showroom" ("key","name","address","whatsapp","position","type","active","updatedAt")
VALUES ('online','Online','Online fulfilment pool','N/A',2147483647,'warehouse',true,CURRENT_TIMESTAMP),
       ('thamel','Thamel','Thamel','N/A',0,'showroom',true,CURRENT_TIMESTAMP);
INSERT INTO "StockLevel" ("id","variationId","showroomKey","qty","updatedAt")
VALUES ('physical_level','variation_positive','thamel',5,CURRENT_TIMESTAMP);
SQL
expect_failure "$physical_url" "partial or mixed StockLevel ledger"

# 7: partial Online coverage is not a completed rerun.
partial_url="$(bootstrap partial)"
psql "$partial_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Showroom" ("key","name","address","whatsapp","position","type","active","updatedAt")
VALUES ('online','Online','Online fulfilment pool','N/A',2147483647,'warehouse',true,CURRENT_TIMESTAMP);
INSERT INTO "StockLevel" ("id","variationId","showroomKey","qty","updatedAt")
VALUES ('partial_level','variation_positive','online',5,CURRENT_TIMESTAMP);
SQL
expect_failure "$partial_url" "partial or mixed StockLevel ledger"

# 8: a customer-facing or otherwise mismatched reserved key fails closed.
wrong_url="$(bootstrap wrong)"
psql "$wrong_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO "Showroom" ("key","name","address","whatsapp","position","type","active","updatedAt")
VALUES ('online','Customer Online Shop','Kathmandu','N/A',0,'showroom',true,CURRENT_TIMESTAMP);
SQL
expect_failure "$wrong_url" "unexpected definition"

rm -f "/tmp/${db_prefix}.out"
echo "online stock migration SQL scenarios: 8 passed"
