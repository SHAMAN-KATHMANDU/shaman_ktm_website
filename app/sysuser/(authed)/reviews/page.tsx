"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  authorEmail: string | null;
  isApproved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string };
}

type Filter = "pending" | "approved" | "all";

export default function ReviewsModerationPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const j = await fetch(
      `/api/sysuser/reviews?status=${filter}&pageSize=100`,
    ).then((r) => r.json());
    setRows(j.reviews ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setApproved = async (r: Review, approved: boolean) => {
    const res = await fetch(`/api/sysuser/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: approved }),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    toast.success(approved ? "Approved" : "Unapproved");
    reload();
  };

  const remove = async (r: Review) => {
    const ok = await confirm({
      title: `Delete this review?`,
      description: `"${r.title}" by ${r.authorName}`,
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/reviews/${r.id}`, { method: "DELETE" });
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Content" }, { label: "Reviews" }]}
        title="Reviews"
        description="Moderate customer reviews. Only approved reviews show on product pages."
      />

      <Tabs
        defaultValue="pending"
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
      >
        <TabList>
          <Tab value="pending">Pending</Tab>
          <Tab value="approved">Approved</Tab>
          <Tab value="all">All</Tab>
        </TabList>
      </Tabs>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={20} />}
          title={
            filter === "pending"
              ? "No pending reviews"
              : filter === "approved"
                ? "No approved reviews yet"
                : "No reviews"
          }
          description="Customer reviews submitted from product pages will land here."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-display text-lg">
                      {"★".repeat(r.rating)}
                      <span className="opacity-30">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </span>
                    <Badge tone={r.isApproved ? "success" : "muted"}>
                      {r.isApproved ? "approved" : "pending"}
                    </Badge>
                    <span className="text-xs opacity-60">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-display text-xl mb-1">{r.title}</h3>
                  <p className="text-sm opacity-80 whitespace-pre-wrap">
                    {r.body}
                  </p>
                  <div className="mt-3 text-xs opacity-60">
                    by <strong>{r.authorName}</strong>
                    {r.authorEmail && ` · ${r.authorEmail}`}
                    {" · on "}
                    <Link
                      href={`/sysuser/products/${r.product.id}`}
                      className="underline hover:text-[var(--color-gold)]"
                    >
                      {r.product.name}
                    </Link>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {r.isApproved ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<X size={12} />}
                      onClick={() => setApproved(r, false)}
                    >
                      Unapprove
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      icon={<Check size={12} />}
                      onClick={() => setApproved(r, true)}
                    >
                      Approve
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={12} />}
                    onClick={() => remove(r)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
