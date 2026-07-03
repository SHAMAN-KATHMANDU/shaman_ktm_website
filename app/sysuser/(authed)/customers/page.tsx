"use client";

import { useEffect, useState } from "react";
import { Users, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { formatDate } from "@/lib/format";

interface CustomerRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  orderCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [total, setTotal] = useState(0);

  const reload = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", page.toString());
    params.set("limit", pageSize.toString());

    const res = await fetch(`/api/sysuser/customers?${params}`);
    const j = await res.json();
    setRows(j.customers ?? []);
    setTotal(j.total ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [debouncedSearch, page, pageSize]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => <div className="font-medium">{c.name}</div>,
    },
    {
      key: "email",
      header: "Email",
      render: (c) => <div className="font-mono text-xs">{c.email}</div>,
    },
    {
      key: "phone",
      header: "Phone",
      width: "120px",
      render: (c) => (
        <div className="font-mono text-xs">
          {c.phone || <span className="opacity-40">—</span>}
        </div>
      ),
    },
    {
      key: "orderCount",
      header: "Orders",
      width: "80px",
      align: "center",
      render: (c) => <span className="font-medium">{c.orderCount}</span>,
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      width: "140px",
      render: (c) =>
        c.lastLoginAt ? (
          <span className="text-sm">{formatDate(c.lastLoginAt)}</span>
        ) : (
          <span className="text-xs opacity-40">Never</span>
        ),
    },
    {
      key: "createdAt",
      header: "Joined",
      width: "120px",
      render: (c) => <span className="text-sm">{formatDate(c.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Customers" }]}
        title="Customers"
        description={`Manage ${total} registered customer${total === 1 ? "" : "s"}.`}
      />

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.id}
            empty={
              <EmptyState
                icon={<Users size={20} />}
                title="No customers found"
                description="Customers who place orders will appear here."
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
