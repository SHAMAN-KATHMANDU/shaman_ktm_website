"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search, Star, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { slugifyLite } from "@/components/ui/slug-input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  isFeatured: boolean;
  isNewRelease: boolean;
  price: number;
  thumbnailUrl: string | null;
  updatedAt: string;
}

export default function ProductsListPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/products");
    const j = await res.json();
    setRows(j.products ?? []);
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) || x.slug.toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, debouncedSearch, statusFilter]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const bulk = async (
    field: "isFeatured" | "isNewRelease",
    value: boolean,
  ) => {
    if (selected.size === 0) return;
    const res = await fetch("/api/sysuser/products/featured", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), [field]: value }),
    });
    if (!res.ok) {
      toast.error("Bulk update failed");
      return;
    }
    toast.success(
      `${value ? "Marked" : "Cleared"} ${selected.size} product${selected.size === 1 ? "" : "s"}`,
    );
    setSelected(new Set());
    reload();
  };

  const create = async () => {
    const name = await askPrompt({
      title: "New product",
      label: "Name",
      placeholder: "e.g. Singing Bowl",
      validate: (v) => (v ? null : "Name is required"),
    });
    if (!name) return;
    const slug = slugifyLite(name);
    const res = await fetch("/api/sysuser/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        description: "",
        price: 0,
        currency: "NPR",
        tags: [],
        images: [],
        variations: [],
        status: "draft",
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Create failed", j?.message ?? undefined);
      return;
    }
    const j = await res.json();
    window.location.href = `/sysuser/products/${j.product.id}`;
  };

  const columns: Column<ProductRow>[] = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.thumbnailUrl}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-[var(--color-base)]" />
          )}
          <div>
            <Link
              href={`/sysuser/products/${p.id}`}
              className="text-[var(--color-gold)] hover:underline"
            >
              {p.name}
            </Link>
            <div className="text-[10px] opacity-50">{p.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      width: "120px",
      align: "right",
      render: (p) => (
        <span className="font-mono">NPR {p.price.toLocaleString()}</span>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      width: "160px",
      render: (p) => (
        <div className="flex gap-1">
          {p.isFeatured && (
            <Badge tone="gold" icon={<Star size={10} />}>
              Featured
            </Badge>
          )}
          {p.isNewRelease && <Badge tone="success">NEW</Badge>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (p) => (
        <Badge tone={p.status === "published" ? "success" : "muted"}>
          {p.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Catalog" }, { label: "Products" }]}
        title="Products"
        description="Hand-curated catalog. Tick rows to bulk-feature or mark as new."
        actions={
          <Button onClick={create} icon={<Plus size={12} />}>
            New product
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
            <Search size={14} className="opacity-50" />
            <input
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <RadioGroup
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
            variant="segmented"
          />
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 px-3 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <span className="opacity-50">·</span>
            <Button
              size="sm"
              variant="secondary"
              icon={<Star size={12} />}
              onClick={() => bulk("isFeatured", true)}
            >
              Set featured
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulk("isFeatured", false)}
            >
              Unfeature
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Sparkles size={12} />}
              onClick={() => bulk("isNewRelease", true)}
            >
              Mark new
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulk("isNewRelease", false)}
            >
              Clear new
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div>
          <DataTable
            columns={columns}
            rows={paged}
            rowKey={(p) => p.id}
            selectable
            selected={selected}
            onSelectChange={setSelected}
            empty={
              <EmptyState
                icon={<Package size={20} />}
                title="No products yet"
                description="Add your first product to start filling the catalog."
                action={
                  <Button onClick={create} icon={<Plus size={12} />}>
                    New product
                  </Button>
                }
              />
            }
          />
          {filtered.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
    </div>
  );
}
