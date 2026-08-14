"use client";

import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

interface VariationRef {
  sku: string;
  label: string | null;
  product: { name: string; slug: string };
}

interface MovementRow {
  id: string;
  variationId: string;
  showroomKey: string;
  delta: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  note: string | null;
  createdAt: string;
  variation: VariationRef;
  staff: { id: string; name: string } | null;
}

interface LevelRow {
  id: string;
  variationId: string;
  showroomKey: string;
  qty: number;
  updatedAt: string;
  variation: VariationRef;
}

const REASONS = [
  "sale",
  "order",
  "transfer",
  "adjustment",
  "return",
  "correction",
  "initial_seed",
] as const;

const REASON_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "muted"> = {
  sale: "gold",
  order: "gold",
  transfer: "neutral",
  adjustment: "muted",
  return: "success",
  correction: "danger",
  initial_seed: "neutral",
};

export default function StockPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"ledger" | "levels">("ledger");
  const [showrooms, setShowrooms] = useState<{ key: string; name: string }[]>([]);
  const [showroomKey, setShowroomKey] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState({
    variationId: "",
    showroomKey: "",
    delta: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (showroomKey) qs.set("showroomKey", showroomKey);
    if (tab === "ledger" && reason) qs.set("reason", reason);
    const path = tab === "ledger" ? "movements" : "levels";
    const j = await fetch(`/api/sysuser/stock/${path}?${qs}`).then((r) =>
      r.json(),
    );
    if (tab === "ledger") setMovements(j.movements ?? []);
    else setLevels(j.levels ?? []);
    setTotal(j.total ?? 0);
    setLoading(false);
  }, [tab, showroomKey, reason, page, limit]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/sysuser/showrooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setShowrooms(j?.showrooms ?? []))
      .catch(() => setShowrooms([]));
  }, []);

  const submitAdjustment = async () => {
    const delta = Number(adjust.delta);
    if (!adjust.variationId || !adjust.showroomKey || !Number.isInteger(delta) || delta === 0) {
      toast.error("Variation, showroom and a non-zero whole-number delta are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/stock/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variationId: adjust.variationId.trim(),
        showroomKey: adjust.showroomKey,
        delta,
        note: adjust.note.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Adjustment failed");
      return;
    }
    toast.success("Adjustment recorded");
    setAdjustOpen(false);
    setAdjust({ variationId: "", showroomKey: "", delta: "", note: "" });
    load();
  };

  const variationCell = (v: VariationRef) => (
    <div>
      <div className="font-medium">{v.product.name}</div>
      <div className="text-xs text-ink-soft">
        {v.label ? `${v.label} · ` : ""}
        {v.sku}
      </div>
    </div>
  );

  const movementColumns: Column<MovementRow>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (r) => (
        <span className="text-xs text-ink-soft">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    { key: "variation", header: "Item", render: (r) => variationCell(r.variation) },
    { key: "showroom", header: "Showroom", render: (r) => r.showroomKey },
    {
      key: "delta",
      header: "Delta",
      align: "right",
      render: (r) => (
        <span
          className={`font-mono tabular-nums ${
            r.delta > 0
              ? "text-accent-deep"
              : "text-rakta"
          }`}
        >
          {r.delta > 0 ? "+" : ""}
          {r.delta}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <Badge tone={REASON_TONE[r.reason] ?? "neutral"}>{r.reason}</Badge>,
    },
    {
      key: "ref",
      header: "Ref",
      render: (r) =>
        r.refType ? (
          <span className="text-xs text-ink-soft">
            {r.refType}
            {r.refId ? ` · ${r.refId.slice(0, 8)}…` : ""}
          </span>
        ) : (
          <span className="text-xs text-ink-soft">—</span>
        ),
    },
    {
      key: "staff",
      header: "By",
      render: (r) =>
        r.staff?.name ?? <span className="text-xs text-ink-soft">system</span>,
    },
    {
      key: "note",
      header: "Note",
      render: (r) => <span className="text-xs text-ink-soft">{r.note ?? ""}</span>,
    },
  ];

  const levelColumns: Column<LevelRow>[] = [
    { key: "variation", header: "Item", render: (r) => variationCell(r.variation) },
    { key: "showroom", header: "Showroom", render: (r) => r.showroomKey },
    { key: "qty", header: "In stock", align: "right", render: (r) => r.qty },
    {
      key: "updatedAt",
      header: "Updated",
      render: (r) => (
        <span className="text-xs text-ink-soft">
          {new Date(r.updatedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "Stock ledger" }]}
        title="Stock ledger"
        description="Append-only movement history and the per-showroom balances derived from it. Pools are separate per showroom — a mistake is fixed with a reversing entry, never an edit."
        actions={
          <Button
            variant="secondary"
            icon={<SlidersHorizontal size={14} />}
            onClick={() => setAdjustOpen(true)}
          >
            Record adjustment
          </Button>
        }
      />

      <Tabs
        defaultValue="ledger"
        value={tab}
        onValueChange={(v) => {
          setTab(v as "ledger" | "levels");
          setPage(1);
        }}
      >
        <TabList>
          <Tab value="ledger">Movements</Tab>
          <Tab value="levels">Current levels</Tab>
        </TabList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem]">
          <Field label="Showroom">
            <Select
              value={showroomKey}
              onChange={(v) => {
                setShowroomKey(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All showrooms" },
                ...showrooms.map((s) => ({ value: s.key, label: s.name })),
              ]}
            />
          </Field>
        </div>
        {tab === "ledger" && (
          <div className="min-w-[12rem]">
            <Field label="Reason">
              <Select
                value={reason}
                onChange={(v) => {
                  setReason(v);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All reasons" },
                  ...REASONS.map((r) => ({ value: r, label: r })),
                ]}
              />
            </Field>
          </div>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-ink-soft">Loading…</div>
        ) : tab === "ledger" ? (
          movements.length === 0 ? (
            <EmptyState
              title="No movements yet"
              description="Seed launch stock or record an adjustment to start the ledger."
            />
          ) : (
            <>
              <DataTable
                columns={movementColumns}
                rows={movements}
                rowKey={(r) => r.id}
              />
              <Pagination
                page={page}
                pageSize={limit}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
              />
            </>
          )
        ) : levels.length === 0 ? (
          <EmptyState
            title="No stock levels yet"
            description="Levels appear once the ledger has movements for a variation and showroom."
          />
        ) : (
          <>
            <DataTable columns={levelColumns} rows={levels} rowKey={(r) => r.id} />
            <Pagination
              page={page}
              pageSize={limit}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      <Dialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title="Record stock adjustment"
        description="Writes an append-only 'adjustment' entry against one showroom's pool. Use a negative delta to remove stock."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment} disabled={saving}>
              {saving ? "Recording…" : "Record"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Variation ID"
            required
            hint="Copy the variation id from the product's admin page."
          >
            <TextInput
              value={adjust.variationId}
              onChange={(e) =>
                setAdjust({ ...adjust, variationId: e.target.value })
              }
              placeholder="cl…"
            />
          </Field>
          <Field label="Showroom" required>
            <Select
              value={adjust.showroomKey}
              onChange={(v) => setAdjust({ ...adjust, showroomKey: v })}
              options={showrooms.map((s) => ({ value: s.key, label: s.name }))}
              placeholder="Select showroom…"
            />
          </Field>
          <Field label="Delta" required hint="Whole units. e.g. 5 or -2.">
            <TextInput
              value={adjust.delta}
              onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })}
              placeholder="-2"
            />
          </Field>
          <Field label="Note">
            <Textarea
              value={adjust.note}
              onChange={(e) => setAdjust({ ...adjust, note: e.target.value })}
              rows={3}
              placeholder="Physical count on 2083-04-24 found 2 fewer."
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
