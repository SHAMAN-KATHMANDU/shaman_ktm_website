"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatNpr, formatDate } from "@/lib/format";
import { STATUS_TRANSITIONS, type OrderStatus } from "@/lib/orders/constants";
import { DeliveryLogPanel } from "@/components/sysuser/orders/delivery-log-panel";
import type { Order, OrderItem, OrderStatusEvent } from "@/lib/api/types";

interface OrderDetail extends Order {
  customer: {
    id: string;
    email: string;
    name: string;
    phone?: string;
  };
}

interface TimelineEvent extends OrderStatusEvent {
  createdBy?: string;
}

const STATUS_COLORS: Record<OrderStatus, "neutral" | "gold" | "success" | "danger"> = {
  pending: "neutral",
  confirmed: "gold",
  shipped: "gold",
  delivered: "success",
  cancelled: "danger",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sysuser/orders/${id}`);
    if (!res.ok) {
      setError("Failed to load order");
      setLoading(false);
      return;
    }
    const j = await res.json();
    setOrder(j.order);
    setSelectedStatus(null);
    setNotes("");
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !order) return;

    setUpdating(true);
    setError(null);

    const res = await fetch(`/api/sysuser/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: selectedStatus,
        notes: notes.trim() || undefined,
      }),
    });

    setUpdating(false);

    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as {
        message?: string;
        availableOptions?: string[];
      } | null;
      setError(j?.message ?? "Update failed");
      return;
    }

    toast.success(`Order updated to ${selectedStatus}`);
    await reload();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading..."
          crumbs={[
            { label: "Orders", href: "/sysuser/orders" },
            { label: "Loading..." },
          ]}
        />
        <div className="opacity-60">Loading…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Order Not Found"
          crumbs={[
            { label: "Orders", href: "/sysuser/orders" },
            { label: "Not found" },
          ]}
        />
        <div className="text-red-500">Order not found</div>
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[order.status] ?? [];

  const itemColumns: Column<OrderItem>[] = [
    {
      key: "productName",
      header: "Product",
      render: (item) => (
        <div>
          <div className="font-medium text-sm">{item.productName}</div>
          {item.variationSku && (
            <div className="text-xs opacity-60">SKU: {item.variationSku}</div>
          )}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      width: "100px",
      align: "center",
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      key: "priceAtOrder",
      header: "Price",
      width: "120px",
      align: "right",
      render: (item) => <span className="font-mono">{formatNpr(item.priceAtOrder)}</span>,
    },
    {
      key: "lineTotal",
      header: "Line Total",
      width: "140px",
      align: "right",
      render: (item) => (
        <span className="font-mono font-medium">
          {formatNpr(item.priceAtOrder * item.quantity)}
        </span>
      ),
    },
  ];

  const timelineEvents: TimelineEvent[] = (order.statusEvents ?? []).map((e) => ({
    ...e,
    createdBy: "admin",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Orders", href: "/sysuser/orders" },
          { label: order.number },
        ]}
        title={`Order ${order.number}`}
        actions={
          <Link href="/sysuser/orders">
            <Button variant="secondary" icon={<ArrowLeft size={12} />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Block */}
        <Card className="md:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">Customer</h3>
            <Badge tone="neutral">{order.status}</Badge>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="opacity-60 text-xs mb-1">Name</div>
              <div className="font-medium">{order.customer.name}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Email</div>
              <div className="font-mono text-xs break-all">{order.customer.email}</div>
            </div>
            {order.customer.phone && (
              <div>
                <div className="opacity-60 text-xs mb-1">Phone</div>
                <div className="font-mono text-xs">{order.customer.phone}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Delivery Block */}
        <Card className="md:col-span-1">
          <h3 className="font-display text-lg mb-4">Delivery</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="opacity-60 text-xs mb-1">Name</div>
              <div className="font-medium">{order.delivery.name}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Phone</div>
              <div className="font-mono text-xs">{order.delivery.phone}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Zone</div>
              <div className="font-medium capitalize">{order.delivery.zone}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Address</div>
              <div className="text-xs leading-relaxed">{order.delivery.address}</div>
            </div>
            {order.delivery.notes && (
              <div>
                <div className="opacity-60 text-xs mb-1">Delivery Notes</div>
                <div className="text-xs leading-relaxed italic">{order.delivery.notes}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Order Summary Block */}
        <Card className="md:col-span-1">
          <h3 className="font-display text-lg mb-4">Summary</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="opacity-60 text-xs mb-1">Date</div>
              <div>{formatDate(order.createdAt)}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Items</div>
              <div>{order.items.length}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Subtotal</div>
              <div className="font-mono">{formatNpr(order.subtotal)}</div>
            </div>
            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="opacity-60 text-xs mb-1">Total</div>
              <div className="font-display text-xl font-medium">{formatNpr(order.total)}</div>
            </div>
            <div>
              <div className="opacity-60 text-xs mb-1">Payment Status</div>
              <Badge tone={order.payment.status === "completed" ? "success" : "neutral"}>
                {order.payment.status}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <h3 className="font-display text-lg mb-4">Items</h3>
        <DataTable columns={itemColumns} rows={order.items} rowKey={(item) => item.productId} />
      </Card>

      {/* Status Timeline */}
      <Card>
        <h3 className="font-display text-lg mb-6 flex items-center gap-2">
          <Clock size={16} />
          Timeline
        </h3>
        <div className="space-y-4">
          {timelineEvents.length === 0 ? (
            <div className="text-xs opacity-60">No status events recorded</div>
          ) : (
            timelineEvents.map((event, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[var(--color-gold)]" />
                  {idx < timelineEvents.length - 1 && (
                    <div className="w-0.5 h-12 bg-[var(--color-border)]" />
                  )}
                </div>
                <div className="pb-4 pt-0.5 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={STATUS_COLORS[event.status]}>{event.status}</Badge>
                    <span className="text-xs opacity-60">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {event.notes && (
                    <div className="text-sm italic opacity-75 mt-2">{event.notes}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Status Update Panel */}
      {availableTransitions.length > 0 && (
        <Card className="border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5">
          <h3 className="font-display text-lg mb-4">Update Status</h3>

          {error && (
            <div className="mb-4 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">New Status</label>
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className={`px-4 py-2 rounded-md border transition text-sm font-medium ${
                      selectedStatus === s
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-base)]"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium block mb-2">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this status change…"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)] resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || updating}
                className="flex-1"
              >
                {updating ? "Updating…" : "Update Status"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedStatus(null);
                  setNotes("");
                }}
                disabled={updating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <DeliveryLogPanel
        orderId={id}
        orderStatus={order.status}
        onRecorded={reload}
      />
    </div>
  );
}
