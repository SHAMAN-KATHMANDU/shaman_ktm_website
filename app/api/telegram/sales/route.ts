export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { handleSaleUpdate } from "@/lib/telegram/sale-flow";
import { handleTelegramWebhook } from "@/lib/telegram/webhook";

// Telegram webhook for the sales bot. Auth, dedup and the always-200 contract
// live in handleTelegramWebhook, which both bots share.

export async function POST(req: Request) {
  return handleTelegramWebhook({
    req,
    bot: "sales",
    token: env.TELEGRAM_SALES_BOT_TOKEN,
    handle: handleSaleUpdate,
  });
}
