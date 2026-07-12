import { prisma } from "@/lib/db";

/** Mint an invoice number if needed, using Asia/Kathmandu time for date portion. */
export async function ensureInvoiceNumber(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new Error("Order not found");

  // Already issued
  if (order.invoiceNumber) return order.invoiceNumber;

  // Format: INV-YYYYMMDD-SK<order digits>
  // Date in Asia/Kathmandu timezone (UTC+5:45)
  const createdUtc = order.createdAt;
  const ktmTime = new Date(
    createdUtc.getTime() + 5.75 * 60 * 60 * 1000
  );
  const year = ktmTime.getUTCFullYear();
  const month = String(ktmTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ktmTime.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // Extract digits from order.number "SK-000042" → "SK000042"
  const orderDigits = order.number.replace(/-/g, "");

  const invoiceNumber = `INV-${dateStr}-${orderDigits}`;

  // Atomic update: only if invoiceNumber is still null (race-safe)
  const updated = await prisma.order.updateMany({
    where: { id: orderId, invoiceNumber: null },
    data: { invoiceNumber, invoiceIssuedAt: new Date() },
  });

  // If 0 rows updated, another concurrent request won the race. Re-read.
  if (updated.count === 0) {
    const reread = await prisma.order.findUnique({ where: { id: orderId } });
    if (!reread?.invoiceNumber) throw new Error("Failed to mint invoice number");
    return reread.invoiceNumber;
  }

  return invoiceNumber;
}

/**
 * Pure function: format an order number "SK-000042" to digits "SK000042".
 * Exported for testing.
 */
export function extractOrderDigits(orderNumber: string): string {
  return orderNumber.replace(/-/g, "");
}

/**
 * Pure function: format a date in Asia/Kathmandu time to YYYYMMDD.
 * Exported for testing.
 */
export function formatDateKathmandu(utcDate: Date): string {
  const ktmTime = new Date(utcDate.getTime() + 5.75 * 60 * 60 * 1000);
  const year = ktmTime.getUTCFullYear();
  const month = String(ktmTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ktmTime.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
