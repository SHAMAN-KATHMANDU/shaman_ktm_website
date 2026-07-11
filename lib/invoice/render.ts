import type { Order, OrderItem } from "@prisma/client";
import type { Locale } from "@/lib/i18n/locale";
import { formatDate } from "@/lib/format";

/** HTML-escape user-controlled strings. */
function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

interface InvoiceRenderArgs {
  order: Order & { items: OrderItem[] };
  customerName: string;
  deliveryAddress: string;
  deliveryPhone: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyPan?: string | null;
  companyVat?: string | null;
  locale: Locale;
}

export function renderInvoiceHtml(args: InvoiceRenderArgs): string {
  const isNe = args.locale === "ne";

  // Format issue date
  const issueDateStr = args.order.invoiceIssuedAt
    ? formatDate(args.order.invoiceIssuedAt.toISOString())
    : formatDate(args.order.createdAt.toISOString());

  // Items table rows
  const itemsRows = args.order.items
    .map(
      (item) =>
        `<tr>
        <td style="padding:8px;border-bottom:1px solid #ddd;font-size:13px">${esc(item.productName)}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;font-size:13px;text-align:center">${item.variationSku ? esc(item.variationSku) : "–"}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;font-size:13px;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;font-size:13px;text-align:right">NPR ${item.priceAtOrder.toLocaleString("en-IN")}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;font-size:13px;text-align:right"><strong>NPR ${(item.priceAtOrder * item.quantity).toLocaleString("en-IN")}</strong></td>
      </tr>`,
    )
    .join("");

  // Get i18n labels
  const labels = {
    invoice: isNe ? "इनभॉयस" : "Invoice",
    invoiceNumber: isNe ? "इनभॉयस नम्बर" : "Invoice Number",
    issueDate: isNe ? "जारी गरेको मिति" : "Issue Date",
    orderNumber: isNe ? "अर्डर नम्बर" : "Order Number",
    billTo: isNe ? "यसलाई बिल गर्नुहोस्" : "Bill To",
    items: isNe ? "वस्तुहरु" : "Items",
    itemName: isNe ? "वस्तुको नाम" : "Item Name",
    sku: isNe ? "SKU" : "SKU",
    qty: isNe ? "मात्रा" : "Qty",
    unitPrice: isNe ? "इकाई मूल्य" : "Unit Price",
    total: isNe ? "कुल" : "Total",
    subtotal: isNe ? "उप कुल" : "Subtotal",
    grandTotal: isNe ? "ग्र्यान्ड कुल" : "Grand Total",
    paymentMethod: isNe ? "भुक्तानी विधि" : "Payment Method",
    paymentStatus: isNe ? "भुक्तानी स्थिति" : "Payment Status",
    deliveryAddress: isNe ? "डिलिभरी ठेगाना" : "Delivery Address",
    phone: isNe ? "फोन" : "Phone",
    pan: "PAN",
    vat: "VAT",
    pending: isNe ? "लम्बित" : "Pending",
    completed: isNe ? "पूर्ण" : "Completed",
    cod: isNe ? "नगद डिलिभरीमा" : "Cash on Delivery",
  };

  const paymentStatusLabel =
    args.order.paymentStatus === "completed"
      ? labels.completed
      : labels.pending;

  const paymentMethodLabel =
    args.order.paymentMethod === "cod" ? labels.cod : esc(args.order.paymentMethod);

  const html = `<!DOCTYPE html>
<html lang="${isNe ? "ne" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(args.invoiceNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .invoice { max-width: 850px; margin: 0 auto; padding: 40px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .company-info h1 { font-size: 28px; margin-bottom: 8px; }
    .company-info p { font-size: 13px; margin: 2px 0; color: #666; }
    .invoice-details { text-align: right; }
    .invoice-details .label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
    .invoice-details .value { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    .invoice-details p { font-size: 13px; margin: 4px 0; }
    .section-heading { font-size: 12px; text-transform: uppercase; font-weight: bold; color: #333; margin-top: 30px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .bill-to, .delivery-info { font-size: 13px; margin-bottom: 20px; }
    .bill-to strong, .delivery-info strong { display: block; margin-bottom: 4px; }
    .bill-to p, .delivery-info p { margin: 2px 0; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .items-table th { background: #f5f5f5; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #333; font-size: 12px; }
    .items-table td { padding: 8px; }
    .summary { width: 100%; margin-top: 20px; }
    .summary-row { display: flex; justify-content: flex-end; margin: 8px 0; font-size: 13px; }
    .summary-row .label { width: 150px; text-align: right; color: #666; }
    .summary-row .value { width: 100px; text-align: right; font-family: "Courier New", monospace; }
    .summary-row.total { font-weight: bold; font-size: 16px; margin-top: 12px; padding-top: 12px; border-top: 2px solid #333; }
    .payment-info { display: flex; gap: 40px; margin: 20px 0; font-size: 13px; }
    .payment-info div { flex: 1; }
    .payment-info strong { display: block; margin-bottom: 4px; }
    .payment-info p { color: #666; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
    @media print {
      body { margin: 0; padding: 0; }
      .invoice { margin: 0; padding: 40px; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="company-info">
        <h1>${esc(args.companyName)}</h1>
        <p>${esc(args.companyAddress)}</p>
        <p>${esc(args.companyPhone)}</p>
        <p>${esc(args.companyEmail)}</p>
        ${
          args.companyPan
            ? `<p style="margin-top: 8px;"><strong>PAN:</strong> ${esc(args.companyPan)}</p>`
            : ""
        }
        ${
          args.companyVat
            ? `<p><strong>VAT:</strong> ${esc(args.companyVat)}</p>`
            : ""
        }
      </div>
      <div class="invoice-details">
        <div class="label">${labels.invoice}</div>
        <div class="value">${esc(args.invoiceNumber)}</div>
        <p><strong>${labels.issueDate}:</strong> ${issueDateStr}</p>
        <p><strong>${labels.orderNumber}:</strong> ${esc(args.order.number)}</p>
      </div>
    </div>

    <div class="bill-to">
      <strong>${labels.billTo}</strong>
      <p>${esc(args.customerName)}</p>
    </div>

    <div class="delivery-info">
      <strong>${labels.deliveryAddress}</strong>
      <p>${esc(args.deliveryAddress)}</p>
      <p><strong>${labels.phone}:</strong> ${esc(args.deliveryPhone)}</p>
    </div>

    <div class="section-heading">${labels.items}</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>${labels.itemName}</th>
          <th style="width: 80px; text-align: center;">${labels.sku}</th>
          <th style="width: 60px; text-align: center;">${labels.qty}</th>
          <th style="width: 120px; text-align: right;">${labels.unitPrice}</th>
          <th style="width: 120px; text-align: right;">${labels.total}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <div class="label">${labels.subtotal}</div>
        <div class="value">NPR ${args.order.subtotal.toLocaleString("en-IN")}</div>
      </div>
      <div class="summary-row total">
        <div class="label">${labels.grandTotal}</div>
        <div class="value">NPR ${args.order.total.toLocaleString("en-IN")}</div>
      </div>
    </div>

    <div class="payment-info">
      <div>
        <strong>${labels.paymentMethod}</strong>
        <p>${paymentMethodLabel}</p>
      </div>
      <div>
        <strong>${labels.paymentStatus}</strong>
        <p>${paymentStatusLabel}</p>
      </div>
    </div>

    <div class="footer">
      <p>${esc(args.companyName)} • ${esc(args.companyEmail)} • ${esc(args.companyPhone)}</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}
