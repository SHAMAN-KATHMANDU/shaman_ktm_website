"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatNpr, formatDate } from "@/lib/format";
import {
  DELIVERY_EVENTS,
  DELIVERY_EVENT_LABELS,
  DELIVERY_EVENT_REQUIRES,
  type DeliveryEventName,
} from "@/lib/fulfilment/constants";

interface LoggedEvent {
  id: string;
  event: DeliveryEventName;
  trackingRef: string | null;
  codCollected: number | null;
  landmark: string | null;
  recipientPhone: string | null;
  note: string | null;
  createdAt: string;
  dateBs: string;
  courier: { id: string; label: string } | null;
  staff: { id: string; name: string } | null;
}

interface Courier {
  id: string;
  label: string;
}

const inputClass =
  "w-full rounded-input border border-line bg-bone px-3 py-2 text-sm focus:outline-none focus:border-metal";

const TONE: Record<DeliveryEventName, "neutral" | "gold" | "success" | "danger"> = {
  packed: "neutral",
  dispatched: "gold",
  out_for_delivery: "gold",
  failed_attempt: "danger",
  delivered: "success",
  returned: "danger",
  exchanged: "neutral",
};

/**
 * The delivery log for one order: what has happened, and a form to record the
 * next thing. There is deliberately no edit or delete — a mistake is corrected
 * by recording what actually happened next, which is what makes the log worth
 * reading a month later.
 */
export function DeliveryLogPanel({
  orderId,
  orderStatus,
  onRecorded,
}: {
  orderId: string;
  orderStatus: string;
  /** The order may have moved to shipped/delivered as a result. */
  onRecorded: () => void;
}) {
  const toast = useToast();
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState<DeliveryEventName | "">("");
  const [courierId, setCourierId] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [codCollected, setCodCollected] = useState("");
  const [landmark, setLandmark] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [note, setNote] = useState("");

  // `loading` starts true for the first paint; a reload after recording an
  // event refreshes in place instead of blanking the log.
  const load = useCallback(async () => {
    const [logRes, courierRes] = await Promise.all([
      fetch(`/api/sysuser/orders/${orderId}/delivery`),
      fetch("/api/sysuser/couriers"),
    ]);
    if (logRes.ok) setEvents((await logRes.json()).events ?? []);
    if (courierRes.ok) setCouriers((await courierRes.json()).couriers ?? []);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setEvent("");
    setCourierId("");
    setTrackingRef("");
    setCodCollected("");
    setLandmark("");
    setRecipientPhone("");
    setNote("");
  };

  // Mirror of the server rule, so an impossible event isn't offered in the
  // first place. The server still enforces it — this only saves a round trip.
  const seen = new Set(events.map((e) => e.event));
  const offerable = DELIVERY_EVENTS.filter((e) =>
    DELIVERY_EVENT_REQUIRES[e].every((r) => seen.has(r)),
  );

  const submit = async () => {
    if (!event) return;
    setSaving(true);
    setError(null);
    const qty = Number(codCollected);
    const res = await fetch(`/api/sysuser/orders/${orderId}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        courierId: courierId || null,
        trackingRef: trackingRef.trim() || null,
        codCollected:
          codCollected.trim() !== "" && Number.isFinite(qty) && qty >= 0
            ? Math.round(qty)
            : null,
        landmark: landmark.trim() || null,
        recipientPhone: recipientPhone.trim() || null,
        note: note.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Could not record that");
      return;
    }
    const j = (await res.json().catch(() => null)) as {
      statusWarning?: string | null;
    } | null;
    if (j?.statusWarning) {
      // Recorded, but the customer's view lagged. Say which half worked.
      toast.error(j.statusWarning);
    } else {
      toast.success(`Logged: ${DELIVERY_EVENT_LABELS[event]}`);
    }
    reset();
    await load();
    onRecorded();
  };

  const cancelled = orderStatus === "cancelled";

  return (
    <Card
      title="Delivery log"
      description="What actually happened to this parcel. Append-only — a correction is the next event, never an edit."
    >
      {loading ? (
        <div className="opacity-60 text-sm">Loading…</div>
      ) : (
        <>
          {events.length === 0 ? (
            <p className="text-sm opacity-60">
              Nothing logged yet. Record the packing when it is boxed.
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-3 last:border-0"
                >
                  <Badge tone={TONE[e.event]}>
                    {DELIVERY_EVENT_LABELS[e.event] ?? e.event}
                  </Badge>
                  <span className="text-sm">
                    {formatDate(e.createdAt)}
                    <span className="opacity-50"> · {e.dateBs} BS</span>
                  </span>
                  {e.courier && (
                    <span className="text-sm opacity-80">{e.courier.label}</span>
                  )}
                  {e.trackingRef && (
                    <span className="text-sm opacity-60">{e.trackingRef}</span>
                  )}
                  {e.codCollected != null && (
                    <span className="text-sm text-metal-text">
                      {formatNpr(e.codCollected)} collected
                    </span>
                  )}
                  <span className="text-sm opacity-60">
                    {e.staff?.name ?? "—"}
                  </span>
                  {e.note && (
                    <span className="text-sm opacity-70 basis-full">{e.note}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {cancelled ? (
            <p className="mt-6 text-sm opacity-60">
              This order is cancelled — nothing more happens to it.
            </p>
          ) : (
            <div className="mt-6 space-y-3 border-t border-line pt-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    What happened
                  </label>
                  <select
                    value={event}
                    onChange={(e) =>
                      setEvent(e.target.value as DeliveryEventName | "")
                    }
                    className={inputClass}
                  >
                    <option value="">Choose…</option>
                    {offerable.map((e) => (
                      <option key={e} value={e}>
                        {DELIVERY_EVENT_LABELS[e]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Courier
                  </label>
                  <select
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tracking reference
                  </label>
                  <input
                    value={trackingRef}
                    onChange={(e) => setTrackingRef(e.target.value)}
                    className={inputClass}
                    placeholder="From the courier"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Cash collected (NPR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={codCollected}
                    onChange={(e) => setCodCollected(e.target.value)}
                    className={inputClass}
                    placeholder="Only if money changed hands"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Landmark
                  </label>
                  <input
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className={inputClass}
                    placeholder="near the temple"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Recipient phone
                  </label>
                  <input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className={inputClass}
                    placeholder="If not the buyer's number"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Note</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Phone off, nobody home, left with the neighbour…"
                />
              </div>
              {error && (
                <p className="text-sm text-rakta">{error}</p>
              )}
              <Button onClick={submit} disabled={!event || saving}>
                {saving ? "Recording…" : "Record event"}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
