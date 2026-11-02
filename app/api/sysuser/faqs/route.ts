export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { FaqSchema } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { createFaq, listFaqsAdmin } from "@/lib/cms/faqs";

export async function GET() {
  const g = await requireRole("viewer");
  if (!g.ok) return g.response;
  const faqs = await listFaqsAdmin();
  return NextResponse.json({ message: "ok", faqs });
}

export async function POST(req: Request) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, FaqSchema);
  if (!parsed.ok) return parsed.response;
  let faq;
  try {
    faq = await createFaq(parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Faq",
    entityId: faq.id,
    summary: faq.question,
  });
  return NextResponse.json({ message: "ok", faq });
}
