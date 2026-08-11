"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { formatNpr, formatDate } from "@/lib/format";
import {
  DELIVERY_EVENTS,
  DELIVERY_EVENT_LABELS,
  type DeliveryEventName,
} from "@/lib/fulfilment/constants";

// The delivery report. Read-only by design: events are recorded against an
// order (Orders → the order → Delivery log), so there is no way to write a
// delivery that isn't attached to a parcel.

interface EventRow {
  id: string;
  event: DeliveryEventName;
  orderId: string;
  trackingRef: string | null;
  codCollected: number | null;
  landmark: string | null;
  note: string | null;
  createdAt: string;
  dateBs: string;
  order: { id: string; number: string; deliveryZone: string; total: number };
  courier: { id: string; label: string } | null;
  staff: { id: string; name: string } | null;
}

const TONE: Record<DeliveryEventName, "neutral" | "gold" | "success" | "danger"> = {
  packed: "neutral",
  dispatched: "gold",
  out_for_delivery: "gold",
  failed_attempt: "danger",
  delivered: "success",
  returned: "danger",
  exchanged: "neutral",
};

const PAGE_SIZE = 50;

export default function DeliveryLogPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [couriers, setCouriers] = useState<{ id: string; label: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [event, setEvent] = useState("");
  const [courierId, setCourierId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // No setLoading(true) here: `loading` starts true for the first paint, and a
  // filter change refreshes in place rather than flashing a spinner over rows
  // that are about to be replaced.
  const load = useCallback(async () => {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (event) qs.set("event", event);
    if (courierId) qs.set("courierId", courierId);
    if (from) qs.set("from", new Date(from).toISOString());
    if (to) qs.set("to", new Date(`${to}T23:59:59`).toISOString());

    const res = await fetch(`/api/sysuser/delivery?${qs}`);
    if (res.ok) {
      const j = await res.json();
      setRows(j.events ?? []);
      setCounts(j.counts ?? {});
      setTotal(j.total ?? 0);
    }
    setLoading(false);
  }, [page, event, courierId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/sysuser/couriers");
      if (res.ok) setCouriers((await res.json()).couriers ?? []);
    })();
  }, []);

  const columns: Column<EventRow>[] = [
    {
      key: "event",
      header: "Event",
      render: (r) => (
        <Badge tone={TONE[r.event]}>
          {DELIVERY_EVENT_LABELS[r.event] ?? r.event}
        </Badge>
      ),
    },
    {
      key: "order",
      header: "Order",
      render: (r) => (
        <Link
          href={`/sysuser/orders/${r.orderId}`}
          className="text-[var(--color-gold)] hover:underline"
        >
          {r.order.number}
        </Link>
      ),
    },
    { key: "zone", header: "Zone", render: (r) => r.order.deliveryZone },
    {
      key: "courier",
      header: "Courier",
      render: (r) => r.courier?.label ?? "—",
    },
    {
      key: "tracking",
      header: "Tracking",
      render: (r) => r.trackingRef ?? "—",
    },
    {
      key: "cod",
      header: "Collected",
      render: (r) => (r.codCollected != null ? formatNpr(r.codCollected) : "—"),
    },
    { key: "staff", header: "By", render: (r) => r.staff?.name ?? "—" },
    {
      key: "when",
      header: "When",
      render: (r) => (
        <span className="whitespace-nowrap">
          {formatDate(r.createdAt)}
          <span className="opacity-50"> · {r.dateBs}</span>
        </span>
      ),
    },
    { key: "note", header: "Note", render: (r) => r.note ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery log"
        description="Every real thing that happened to a parcel, newest first. Append-only — recorded against an order, never edited here."
        crumbs={[{ label: "Delivery log" }]}
      />

      {/* The period's figures, derived rather than tallied. */}
      <div className="flex flex-wrap gap-3">
        {DELIVERY_EVENTS.filter((e) => counts[e]).map((e) => (
          <Card key={e} className="px-4 py-3">
            <div className="text-xs uppercase tracking-wide opacity-60">
              {DELIVERY_EVENT_LABELS[e]}
            </div>
            <div className="text-xl text-[var(--color-gold)]">{counts[e]}</div>
          </Card>
        ))}
      </div>

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Event">
            <Select
              value={event}
              onChange={(v) => {
                setEvent(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All events" },
                ...DELIVERY_EVENTS.map((e) => ({
                  value: e,
                  label: DELIVERY_EVENT_LABELS[e],
                })),
              ]}
            />
          </Field>
          <Field label="Courier">
            <Select
              value={courierId}
              onChange={(v) => {
                setCourierId(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All couriers" },
                ...couriers.map((c) => ({ value: c.id, label: c.label })),
              ]}
            />
          </Field>
          <Field label="From">
            <TextInput
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="opacity-60 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing logged for this period"
            description="Delivery events are recorded on an order, under Orders → the order → Delivery log."
          />
        ) : (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
