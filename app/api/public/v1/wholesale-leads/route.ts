export const dynamic = "force-dynamic";

// Wholesale enquiry form on the storefront.
//
// Unlike the Member Circle form, these land straight in the CRM as
// `wholesale_b2b` leads rather than in a queue of their own: a trade enquiry is
// the front of the B2B pipeline (lead → account → deal), and a second inbox
// would only be somewhere for them to sit unworked.
//
// Anonymous endpoint, so the same two spam guards: a fixed-window IP rate limit
// and a honeypot field ("website") that must stay empty.

import { NextResponse } from "next/server";
import { WholesaleEnquirySchema } from "@/lib/validation/schemas";
import { createWebEnquiry } from "@/lib/crm";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";
import { CmsError } from "@/lib/cms/errors";

const RATE_MAX = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`wholesale-lead:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { message: "Too many requests — please try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = WholesaleEnquirySchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid submission", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Honeypot tripped — pretend success so bots learn nothing.
  if (d.website) {
    return NextResponse.json({ message: "ok", enquiry: { pending: true } });
  }

  try {
    await createWebEnquiry({
      name: d.contactName,
      phone: d.whatsapp,
      email: d.email || null,
      interest: "wholesale_b2b",
      companyName: d.companyName,
      productInterest: d.productInterest || null,
      quantityNeeded: d.quantityNeeded ?? null,
      note: d.note || null,
    });
  } catch (err) {
    // Never leak CRM internals to an anonymous caller, and never show a trade
    // buyer a stack trace: log it and let them believe the send worked, because
    // from their side it either arrives or they phone us.
    console.error("[wholesale] enquiry failed", {
      error: err instanceof CmsError ? err.message : String(err),
    });
    return NextResponse.json(
      { message: "Could not send that just now — please try again." },
      { status: 500 },
    );
  }

  // Deliberately no lead id in the response: an anonymous form has no business
  // learning CRM row ids.
  return NextResponse.json({ message: "ok", enquiry: { pending: true } });
}
