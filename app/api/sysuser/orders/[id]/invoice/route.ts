export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ensureInvoiceNumber } from "@/lib/invoice/number";
import { renderInvoiceHtml } from "@/lib/invoice/render";
import type { Locale } from "@/lib/i18n/locale";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;

  // Get query parameter: ?lang=en|ne (default en)
  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") || "en") as Locale;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  try {
    // Mint invoice number if needed
    const invoiceNumber = await ensureInvoiceNumber(order.id);

    // Fetch updated order to get invoiceIssuedAt
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // Get site config for company details
    const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const config = (siteConfig?.data as Record<string, unknown>) || {};
    const contact = (config.contact as Record<string, string> | undefined) || {};

    const html = renderInvoiceHtml({
      order: updatedOrder,
      customerName: order.customer.name,
      deliveryAddress: order.deliveryAddress,
      deliveryPhone: order.deliveryPhone,
      invoiceNumber,
      companyName: (config.name as string) || "Shaman Kathmandu",
      companyAddress: (contact.address as string) || "",
      companyPhone: (contact.phone as string) || "",
      companyEmail: (contact.email as string) || "",
      companyPan: (config.companyPan as string | null | undefined) || null,
      companyVat: (config.companyVat as string | null | undefined) || null,
      locale: lang,
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[invoice]", err);
    return NextResponse.json(
      { message: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
