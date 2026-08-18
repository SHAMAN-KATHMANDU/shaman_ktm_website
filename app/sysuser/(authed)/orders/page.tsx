"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { formatNpr, formatDate } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/constants";

interface OrderRow {
  id: string;
  number: string;
  customer: {
    id: string;
    email: string;
    name: string;
  };
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: "pending" | "completed";
  total: number;
  itemCount: number;
  deliveryZone: string;
  createdAt: string;
}

const STATUS_COLORS: Record<OrderStatus, "neutral" | "gold" | "success" | "danger"> = {
  pending: "neutral",
  confirmed: "gold",
  shipped: "gold",
  delivered: "success",
  cancelled: "danger",
};

export default function OrdersListPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);

  // Server-side pagination + search — orders are unbounded, so the API
  // filters and pages (unlike small fixed lists such as elements).
  useEffect(() => {
    let cancelled = false;
    const reload = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/sysuser/orders?${params}`);
      const j = await res.json();
      if (cancelled) return;
      setRows(j.orders ?? []);
      setTotal(j.total ?? 0);
      setLoading(false);
    };
    void reload();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, debouncedSearch, page, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize]);

  const statusOptions = [
    { value: "all", label: "All" },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];

  const columns: Column<OrderRow>[] = [
    {
      key: "number",
      header: "Order",
      render: (o) => (
        <Link
          href={`/sysuser/orders/${o.id}`}
          className="text-metal-text hover:underline font-medium"
        >
          {o.number}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div>
          <div className="font-medium text-sm">{o.customer.name}</div>
          <div className="text-xs text-ink-soft">{o.customer.email}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (o) => (
        <Badge tone={STATUS_COLORS[o.status]}>
          {o.status}
        </Badge>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      width: "120px",
      render: (o) => (
        <div className="space-y-1">
          <Badge tone={o.paymentStatus === "completed" ? "success" : "neutral"}>
            {o.paymentStatus}
          </Badge>
          <div className="text-[10px] uppercase tracking-wide text-ink-soft">
            {o.paymentMethod}
          </div>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "140px",
      align: "right",
      render: (o) => <span className="font-mono">{formatNpr(o.total)}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      width: "70px",
      align: "center",
      render: (o) => <span className="text-sm">{o.itemCount}</span>,
    },
    {
      key: "deliveryZone",
      header: "Zone",
      width: "100px",
      render: (o) => <span className="text-sm capitalize">{o.deliveryZone}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      width: "120px",
      render: (o) => <span className="text-sm">{formatDate(o.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Orders" }]}
        title="Orders"
        description="View and manage all customer orders."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-input border border-line bg-bone px-3 py-1.5">
            <Search size={14} className="opacity-50" />
            <input
              placeholder="Search by order number, name, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <RadioGroup
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as OrderStatus | "all")}
            options={statusOptions}
            variant="segmented"
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-ink-soft">Loading…</div>
      ) : (
        <div>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(o) => o.id}
            empty={
              <EmptyState
                icon={<ShoppingCart size={20} />}
                title="No orders yet"
                description="Orders from customers will appear here."
              />
            }
          />
          {total > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
    </div>
  );
}
