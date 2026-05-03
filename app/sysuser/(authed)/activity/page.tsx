"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Entry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
}

export default function ActivityPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sysuser/activity?limit=100")
      .then((r) => r.json())
      .then((j) => {
        setRows(j.entries ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Site" }, { label: "Activity" }]}
        title="Activity log"
        description="Append-only record of admin edits."
      />
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<History size={20} />}
          title="No activity yet"
          description="Edits to products, posts, pages, etc. will show up here."
        />
      ) : (
        <Card>
          <ul className="space-y-1.5">
            {rows.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm"
              >
                <Badge tone={tone(e.action)}>{e.action}</Badge>
                <span className="opacity-60">{e.entity}</span>
                {e.summary && <span className="flex-1">{e.summary}</span>}
                <span className="text-xs opacity-50">{e.actor}</span>
                <span className="text-xs opacity-50">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function tone(action: string): "neutral" | "success" | "danger" | "gold" {
  if (action === "create" || action === "publish") return "success";
  if (action === "delete") return "danger";
  if (action === "feature") return "gold";
  return "neutral";
}
