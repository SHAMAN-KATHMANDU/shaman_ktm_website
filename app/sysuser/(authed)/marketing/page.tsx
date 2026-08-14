"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatNpr } from "@/lib/format";

interface SpendRow {
  id: string;
  dateAd: string;
  dateBs: string;
  platform: string;
  campaignName: string | null;
  amountSpent: number;
  currency: string;
  fxRate: number;
  amountNpr: number;
  impressions: number | null;
  results: number | null;
  costPerResult: number | null;
  source: string;
}

interface SocialRow {
  id: string;
  periodBs: string;
  periodAd: string;
  platform: string;
  followers: number | null;
  newFollowers: number | null;
  posts: number | null;
  reach: number | null;
  impressions: number | null;
  engagementRate: number | null;
  source: string;
}

interface ContentRow {
  id: string;
  date: string;
  dateBs: string;
  platform: string;
  contentType: string;
  topic: string | null;
  reach: number | null;
  likes: number | null;
  engagementRate: number | null;
}

const AD_PLATFORMS = ["facebook", "instagram", "tiktok", "google", "youtube"];

type TabKey = "ad_spend" | "social" | "content";

export default function MarketingPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("ad_spend");

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [spendStats, setSpendStats] = useState({
    totalNpr: 0,
    totalResults: 0,
    costPerResultNpr: null as number | null,
    byPlatform: [] as { platform: string; amountNpr: number; results: number }[],
  });
  const [social, setSocial] = useState<SocialRow[]>([]);
  const [content, setContent] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [spendOpen, setSpendOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spendForm, setSpendForm] = useState({
    dateAd: new Date().toISOString().slice(0, 10),
    platform: "facebook",
    campaignName: "",
    amountSpent: "",
    currency: "AUD",
    fxRate: "",
    impressions: "",
    results: "",
  });
  const [importForm, setImportForm] = useState({ kind: "ad_spend", csv: "" });
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === "ad_spend") {
      const j = await fetch("/api/sysuser/marketing/ad-spend").then((r) => r.json());
      setSpend(j.spend ?? []);
      setSpendStats({
        totalNpr: j.totalNpr ?? 0,
        totalResults: j.totalResults ?? 0,
        costPerResultNpr: j.costPerResultNpr ?? null,
        byPlatform: j.byPlatform ?? [],
      });
    } else if (tab === "social") {
      const j = await fetch("/api/sysuser/marketing/social-metrics").then((r) => r.json());
      setSocial(j.metrics ?? []);
    } else {
      const j = await fetch("/api/sysuser/marketing/content-log").then((r) => r.json());
      setContent(j.entries ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const previewNpr = (() => {
    const a = Number(spendForm.amountSpent);
    const r = Number(spendForm.fxRate);
    if (!Number.isFinite(a) || !Number.isFinite(r) || a < 0 || r <= 0) return null;
    return Math.round(a * r);
  })();

  const saveSpend = async () => {
    if (previewNpr === null) {
      toast.error("Amount and a positive FX rate are required — without the rate the NPR figure would be wrong");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/marketing/ad-spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateAd: new Date(spendForm.dateAd).toISOString(),
        platform: spendForm.platform,
        campaignName: spendForm.campaignName.trim() || null,
        amountSpent: Number(spendForm.amountSpent),
        currency: spendForm.currency.trim().toUpperCase(),
        fxRate: Number(spendForm.fxRate),
        impressions: spendForm.impressions ? Number(spendForm.impressions) : null,
        results: spendForm.results ? Number(spendForm.results) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not save the spend row");
      return;
    }
    toast.success("Ad spend recorded");
    setSpendOpen(false);
    load();
  };

  const runImport = async () => {
    if (!importForm.csv.trim()) {
      toast.error("Paste the CSV first");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/marketing/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importForm),
    });
    setSaving(false);
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(j?.message ?? "Import failed");
      return;
    }
    setImportResult({ imported: j.imported, skipped: j.skipped ?? [] });
    toast.success(`Imported ${j.imported} row${j.imported === 1 ? "" : "s"}`);
    load();
  };

  const spendColumns: Column<SpendRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <div>
          <div>{r.dateBs}</div>
          <div className="text-xs text-ink-soft">
            {new Date(r.dateAd).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    { key: "platform", header: "Platform", render: (r) => r.platform },
    {
      key: "campaign",
      header: "Campaign",
      render: (r) => r.campaignName ?? <span className="text-xs text-ink-soft">—</span>,
    },
    {
      key: "spent",
      header: "Spent",
      align: "right",
      render: (r) => (
        <div>
          <div>
            {r.amountSpent.toLocaleString()} {r.currency}
          </div>
          <div className="text-xs text-ink-soft">@ {r.fxRate}</div>
        </div>
      ),
    },
    {
      key: "npr",
      header: "NPR",
      align: "right",
      render: (r) => formatNpr(r.amountNpr),
    },
    {
      key: "results",
      header: "Results",
      align: "right",
      render: (r) => r.results ?? <span className="text-xs text-ink-soft">—</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (r) => (
        <Badge tone={r.source === "csv_import" ? "neutral" : "muted"}>{r.source}</Badge>
      ),
    },
  ];

  const socialColumns: Column<SocialRow>[] = [
    { key: "period", header: "Month", render: (r) => r.periodBs },
    { key: "platform", header: "Platform", render: (r) => r.platform },
    {
      key: "followers",
      header: "Followers",
      align: "right",
      render: (r) => (
        <div>
          <div>{r.followers?.toLocaleString() ?? "—"}</div>
          {r.newFollowers != null && (
            <div className="text-xs text-ink-soft">
              {r.newFollowers > 0 ? "+" : ""}
              {r.newFollowers}
            </div>
          )}
        </div>
      ),
    },
    { key: "posts", header: "Posts", align: "right", render: (r) => r.posts ?? "—" },
    {
      key: "reach",
      header: "Reach",
      align: "right",
      render: (r) => r.reach?.toLocaleString() ?? "—",
    },
    {
      key: "engagement",
      header: "Engagement",
      align: "right",
      render: (r) => (r.engagementRate != null ? `${r.engagementRate}%` : "—"),
    },
    {
      key: "source",
      header: "Source",
      render: (r) => <Badge tone="muted">{r.source}</Badge>,
    },
  ];

  const contentColumns: Column<ContentRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <div>
          <div>{r.dateBs}</div>
          <div className="text-xs text-ink-soft">
            {new Date(r.date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    { key: "platform", header: "Platform", render: (r) => r.platform },
    { key: "type", header: "Type", render: (r) => r.contentType },
    {
      key: "topic",
      header: "Topic",
      render: (r) => r.topic ?? <span className="text-xs text-ink-soft">—</span>,
    },
    {
      key: "reach",
      header: "Reach",
      align: "right",
      render: (r) => r.reach?.toLocaleString() ?? "—",
    },
    { key: "likes", header: "Likes", align: "right", render: (r) => r.likes ?? "—" },
    {
      key: "engagement",
      header: "Engagement",
      align: "right",
      render: (r) => (r.engagementRate != null ? `${r.engagementRate}%` : "—"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "Marketing" }]}
        title="Marketing"
        description="Ad spend, monthly social figures, and what was published. Spend is stored in the currency it was paid in, with the rate used, so the NPR total is auditable."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Upload size={14} />}
              onClick={() => {
                setImportResult(null);
                setImportOpen(true);
              }}
            >
              Import CSV
            </Button>
            {tab === "ad_spend" && (
              <Button icon={<Plus size={14} />} onClick={() => setSpendOpen(true)}>
                Record spend
              </Button>
            )}
          </div>
        }
      />

      <Tabs
        defaultValue="ad_spend"
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
      >
        <TabList>
          <Tab value="ad_spend">Ad spend</Tab>
          <Tab value="social">Social metrics</Tab>
          <Tab value="content">Content log</Tab>
        </TabList>
      </Tabs>

      {tab === "ad_spend" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-ink-soft">
                  Total spend (NPR)
                </div>
                <div className="font-display text-2xl">
                  {formatNpr(spendStats.totalNpr)}
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-ink-soft">
                  Results
                </div>
                <div className="font-display text-2xl">{spendStats.totalResults}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-ink-soft">
                  Cost per result
                </div>
                <div className="font-display text-2xl">
                  {spendStats.costPerResultNpr === null
                    ? "—"
                    : formatNpr(spendStats.costPerResultNpr)}
                </div>
              </div>
            </Card>
          </div>
          {spendStats.byPlatform.length > 0 && (
            <Card>
              <div className="flex flex-wrap gap-4 p-4 text-sm">
                {spendStats.byPlatform.map((p) => (
                  <div key={p.platform}>
                    <span className="text-ink-soft">{p.platform}:</span>{" "}
                    {formatNpr(p.amountNpr)}
                    {p.results > 0 && (
                      <span className="text-ink-soft"> · {p.results} results</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-ink-soft">Loading…</div>
        ) : tab === "ad_spend" ? (
          spend.length === 0 ? (
            <EmptyState
              title="No ad spend recorded"
              description="Record a day, or import the Meta export."
            />
          ) : (
            <DataTable columns={spendColumns} rows={spend} rowKey={(r) => r.id} />
          )
        ) : tab === "social" ? (
          social.length === 0 ? (
            <EmptyState
              title="No social metrics filed"
              description="Import a monthly sheet to get started."
            />
          ) : (
            <DataTable columns={socialColumns} rows={social} rowKey={(r) => r.id} />
          )
        ) : content.length === 0 ? (
          <EmptyState
            title="Nothing in the content log"
            description="Log what was published and how it performed."
          />
        ) : (
          <DataTable columns={contentColumns} rows={content} rowKey={(r) => r.id} />
        )}
      </Card>

      <Dialog
        open={spendOpen}
        onOpenChange={setSpendOpen}
        title="Record ad spend"
        description="One row per campaign per day. Re-recording the same day corrects it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSpendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSpend} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required>
              <TextInput
                type="date"
                value={spendForm.dateAd}
                onChange={(e) => setSpendForm({ ...spendForm, dateAd: e.target.value })}
              />
            </Field>
            <Field label="Platform" required>
              <Select
                value={spendForm.platform}
                onChange={(v) => setSpendForm({ ...spendForm, platform: v })}
                options={AD_PLATFORMS.map((p) => ({ value: p, label: p }))}
              />
            </Field>
          </div>
          <Field label="Campaign">
            <TextInput
              value={spendForm.campaignName}
              onChange={(e) =>
                setSpendForm({ ...spendForm, campaignName: e.target.value })
              }
              placeholder="Shrawan push"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount spent" required>
              <TextInput
                value={spendForm.amountSpent}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, amountSpent: e.target.value })
                }
                placeholder="100"
              />
            </Field>
            <Field label="Currency" required hint="Meta exports in AUD">
              <TextInput
                value={spendForm.currency}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, currency: e.target.value })
                }
                placeholder="AUD"
              />
            </Field>
            <Field label="FX rate" required hint="1 unit = ? NPR">
              <TextInput
                value={spendForm.fxRate}
                onChange={(e) => setSpendForm({ ...spendForm, fxRate: e.target.value })}
                placeholder="89.5"
              />
            </Field>
          </div>
          <div className="rounded-card border border-line p-3 text-sm">
            <span className="text-ink-soft">Files as: </span>
            {previewNpr === null ? (
              <span className="text-ink-soft">
                enter an amount and a positive rate — without the rate this would be
                filed as a foreign-currency number
              </span>
            ) : (
              <span className="font-medium">{formatNpr(previewNpr)}</span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Impressions">
              <TextInput
                value={spendForm.impressions}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, impressions: e.target.value })
                }
              />
            </Field>
            <Field label="Results">
              <TextInput
                value={spendForm.results}
                onChange={(e) => setSpendForm({ ...spendForm, results: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import CSV"
        description="Paste the export. Rows that can't be trusted are skipped and listed rather than guessed."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Close
            </Button>
            <Button onClick={runImport} disabled={saving}>
              {saving ? "Importing…" : "Import"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="What are you importing?" required>
            <Select
              value={importForm.kind}
              onChange={(v) => setImportForm({ ...importForm, kind: v })}
              options={[
                { value: "ad_spend", label: "Ad spend (Meta export)" },
                { value: "social_metrics", label: "Monthly social metrics" },
              ]}
            />
          </Field>
          <Field
            label="CSV"
            required
            hint={
              importForm.kind === "ad_spend"
                ? "Columns: date, platform, campaign, amountSpent, currency, fxRate, impressions, reach, frequency, results, costPerResult, messagingConversations"
                : "Columns: period, platform, followers, newFollowers, posts, stories, reels, reach, impressions, profileVisits, avgLikes, avgComments, avgSharesSaves, engagementRate"
            }
          >
            <Textarea
              value={importForm.csv}
              onChange={(e) => setImportForm({ ...importForm, csv: e.target.value })}
              rows={8}
              placeholder="date,platform,campaign,amountSpent,currency,fxRate,results…"
            />
          </Field>
          {importResult && (
            <div className="rounded-card border border-line p-3 text-sm">
              <div className="font-medium">
                Imported {importResult.imported} row
                {importResult.imported === 1 ? "" : "s"}
                {importResult.skipped.length > 0 &&
                  ` · skipped ${importResult.skipped.length}`}
              </div>
              {importResult.skipped.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                  {importResult.skipped.slice(0, 20).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                  {importResult.skipped.length > 20 && (
                    <li>…and {importResult.skipped.length - 20} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
