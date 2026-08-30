#!/usr/bin/env bash
# Read-only: report which environment variables the RUNNING production
# container actually has, without ever printing a value.
#
# Why this exists: the deployed compose file lives on the host at
# /opt/shaman_web/docker-compose.yml and is maintained by hand. It has drifted
# from the copy in this repo before. Watchtower replaces the IMAGE only — it
# never touches that file or .env — so merging a change to the repo's
# docker-compose.yml does NOT change what the container receives. A variable
# can sit in .env, look correct to anyone reading it, and still never be passed
# through. On 2026-08-21 FONEPAY_USERNAME was in .env and unset in the
# container for exactly that reason.
#
# Every variable below is optional or defaulted, so a missing one produces no
# error anywhere: email is dropped to a console line, Meta conversion events
# are never sent, the Telegram bots never answer. This script is the only way
# to tell that apart from "nobody has used the feature yet".
#
#   ssh shaman_web 'bash -s' < deploy/prod/check-env.sh
#
# Values are never echoed — only set / EMPTY / NOT SET, and the character
# length for non-empty values.

set -euo pipefail

CONTAINER="${CONTAINER:-shaman-web}"

# Keep in step with lib/env.ts — test/deploy/compose-env-parity.test.ts fails
# if this list and the schema disagree.
VARS="
DATABASE_URL
SESSION_PASSWORD
ADMIN_BOOTSTRAP_EMAIL
ADMIN_BOOTSTRAP_PASSWORD
S3_PUBLIC_BASE
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM_EMAIL
SMTP_FROM_NAME
NEXT_PUBLIC_SITE_URL
SITE_ORIGIN
PROJECTX_API_MODE
NEXT_PUBLIC_SITE_MODE
META_PIXEL_ID
META_CAPI_ACCESS_TOKEN
META_CAPI_TEST_EVENT_CODE
TELEGRAM_SALES_BOT_TOKEN
TELEGRAM_LEADS_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
RUN_DB_SEED
SEED_STOCK
"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "container '$CONTAINER' not found — set CONTAINER=<name> and retry" >&2
  exit 1
fi

echo "env as seen INSIDE container '$CONTAINER' (values never printed):"
echo

missing=0
empty=0
for v in $VARS; do
  # printenv's exit status distinguishes an absent variable from one that is
  # present with an empty value. Capture the value only inside the container,
  # quote it when measuring, and return only state + length to the host.
  # This avoids eval (and its word-splitting/injection hazards) entirely.
  probe=$(docker exec "$CONTAINER" sh -c '
    if value=$(printenv "$1"); then
      printf "set:%s" "${#value}"
    else
      printf "absent:0"
    fi
  ' sh "$v" 2>/dev/null)
  state=${probe%%:*}
  len=${probe#*:}

  case "$state:$len" in
    absent:*)
      printf '  %-28s NOT SET\n' "$v"
      missing=$((missing + 1))
      ;;
    set:0)
      printf '  %-28s EMPTY\n' "$v"
      empty=$((empty + 1))
      ;;
    set:*)
      printf '  %-28s set (%s chars)\n' "$v" "$len"
      ;;
    *)
      echo "unexpected probe result for $v" >&2
      exit 1
      ;;
  esac
done

echo
echo "$missing of $(echo "$VARS" | grep -c '[A-Z]') variables are not set in the container; EMPTY: $empty."
echo
echo "To fix one: add it to the environment: block of"
echo "/opt/shaman_web/docker-compose.yml AND give it a value in"
echo "/opt/shaman_web/.env, then re-create the container:"
echo "    cd /opt/shaman_web && docker compose up -d app"
echo "Adding it to .env alone is NOT enough, and Watchtower will not pick it up."
