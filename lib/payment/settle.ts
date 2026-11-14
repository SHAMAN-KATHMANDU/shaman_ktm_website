// Order payment settlement. markOrderPaid() is the one place an order becomes
// paid, whatever the method (Fonepay settle, COD cash collected in full).
// Deliberately free of lib/orders imports so lib/orders can call it.

import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

/**
 * Flip an order to paid. Guarded so it happens at most once and never on a
 * cancelled order; returns whether this call made the flip.
 */
export async function markOrderPaid(tx: Db, orderId: string): Promise<boolean> {
  const won = await tx.order.updateMany({
    where: { id: orderId, paymentStatus: "pending", status: { not: "cancelled" } },
    data: { paymentStatus: "completed" },
  });
  return won.count > 0;
}
