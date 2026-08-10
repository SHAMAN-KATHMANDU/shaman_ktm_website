# Telegram bots

Two bots, split by function rather than by showroom (per the reporting spec):

| Bot    | Command | Records                        | Webhook path         |
| ------ | ------- | ------------------------------ | -------------------- |
| Sales  | `/sale` | a draft `Sale`, confirmed by a human before stock moves | `/api/telegram/sales` |
| Leads  | `/lead` | a `CrmLead` with its opening status-history row | `/api/telegram/leads` |

Both are input paths onto the same tables the admin panel writes to. Neither can
bypass a rule the service layer enforces: a bot sale is a draft until someone
confirms it, and a bot lead is written once, at the end, after the staff member
has seen it.

## Environment

```
TELEGRAM_SALES_BOT_TOKEN=   # from BotFather, one per bot
TELEGRAM_LEADS_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=    # 32+ chars, shared by both webhooks
```

`TELEGRAM_WEBHOOK_SECRET` is checked on every delivery and is **not** a bot
token — generate a random string (`openssl rand -hex 24`). An empty secret makes
both webhooks refuse everything, so a half-configured deploy can't be driven by
a stranger.

A bot whose token is unset answers 200 and does nothing, so shipping the code
before the bots exist is safe.

> `TELEGRAM_BOT_MODE` is declared in `lib/env.ts` but nothing reads it yet. Both
> bots are webhook-only; there is no long-polling runner. Local testing means
> either pointing a tunnel at your dev server or calling the route directly.

## Registering the webhooks

Once per bot, after deploying:

```sh
curl -s "https://api.telegram.org/bot<SALES_TOKEN>/setWebhook" \
  -d "url=https://shamankathmandu.com/api/telegram/sales" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"

curl -s "https://api.telegram.org/bot<LEADS_TOKEN>/setWebhook" \
  -d "url=https://shamankathmandu.com/api/telegram/leads" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Check either with `getWebhookInfo`; `last_error_message` is where a wrong secret
or a bad URL shows up.

## Registering staff

A bot only talks to people it recognises. In the admin panel, **Users → Add
user** takes a Telegram user ID and a default showroom, and creates the login
and the linked staff record together. Anyone without an ID is flagged in the
user list.

The ID is the numeric Telegram *user* id, not the @username — the person can get
it from `@userinfobot`. Leaving the default showroom blank marks them a floater,
which is what makes both bots ask where they are at the start of every entry.

## Why the tables carry a `bot` column

Telegram reports a private chat's id as the user's own id — the same value for
every bot — and each bot numbers its own messages from 1. So the sales bot's
message #7 and the leads bot's message #7 arrive as the same
`(chatId, telegramMessageId)` pair.

`TelegramUpdate` and `TelegramSession` are therefore keyed per bot. Without that,
whichever bot spoke second would have its update discarded as an already-handled
retry, and starting a `/lead` would overwrite a scanned-but-unconfirmed `/sale`.
