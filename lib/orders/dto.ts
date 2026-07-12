// Maps prisma Order rows (with items + statusEvents included) onto the
// customer-facing Order shape in lib/api/types.ts.

import type {
  Order as OrderDto,
  OrderItem as OrderItemDto,
  OrderStatus,
  OrderStatusEvent as OrderStatusEventDto,
  DeliveryZone,
  PaymentAttempt,
  PaymentMethod,
  ShipmentInfo,
} from "@/lib/api/types";
import type {
  Order,
  OrderItem,
  OrderStatusEvent,
  PaymentTransaction,
  Shipment,
} from "@prisma/client";

type OrderRow = Order & {
  items: OrderItem[];
  statusEvents?: OrderStatusEvent[];
  shipment?: Shipment | null;
};

export function orderToDto(row: OrderRow): OrderDto {
  return {
    number: row.number,
    items: row.items.map(orderItemToDto),
    subtotal: row.subtotal,
    total: row.total,
    status: row.status as OrderStatus,
    delivery: {
      name: row.deliveryName,
      phone: row.deliveryPhone,
      address: row.deliveryAddress,
      zone: row.deliveryZone as DeliveryZone,
      notes: row.deliveryNotes,
    },
    payment: {
      method: row.paymentMethod as PaymentMethod,
      status: row.paymentStatus as "pending" | "completed",
    },
    statusEvents: (row.statusEvents ?? [])
      .map(
        (e): OrderStatusEventDto => ({
          status: e.status as OrderStatus,
          notes: e.notes,
          createdAt: e.createdAt.toISOString(),
        }),
      ),
    tracking: "shipment" in row && row.shipment ? shipmentToDto(row.shipment) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function paymentAttemptToDto(row: PaymentTransaction): PaymentAttempt {
  return {
    provider: row.provider,
    prn: row.prn,
    amountNpr: row.amountNpr,
    status: row.status as PaymentAttempt["status"],
    verified: row.verified,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
  };
}

export function shipmentToDto(row: Shipment): ShipmentInfo {
  return {
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    destBranch: row.destBranch,
    deliveryType: row.deliveryType,
    deliveryChargeNpr: row.deliveryChargeNpr,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function orderItemToDto(item: OrderItem): OrderItemDto {
  return {
    productId: item.productId,
    productSlug: item.productSlug,
    productName: item.productName,
    thumbnailUrl: item.thumbnailUrl,
    variationId: item.variationId,
    variationSku: item.variationSku,
    quantity: item.quantity,
    priceAtOrder: item.priceAtOrder,
  };
}
