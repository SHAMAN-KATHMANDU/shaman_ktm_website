export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { handleLeadUpdate } from "@/lib/telegram/lead-flow";
import { handleTelegramWebhook } from "@/lib/telegram/webhook";

// Telegram webhook for the leads bot. Auth, dedup and the always-200 contract
// live in handleTelegramWebhook, which both bots share.
//
// A separate bot from sales by design (spec: split by function, not by
// showroom) — the person recording an enquiry is mid-conversation with a
// customer, and should not have to scroll past a sale flow to do it.

export async function POST(req: Request) {
  return handleTelegramWebhook({
    req,
    bot: "leads",
    token: env.TELEGRAM_LEADS_BOT_TOKEN,
    handle: handleLeadUpdate,
  });
}
