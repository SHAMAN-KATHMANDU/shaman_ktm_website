"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MessageSquare, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { Select } from "@/components/ui/select";
import { Field, TextInput, Textarea } from "@/components/ui/field";

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
  source: string;
  product: { id: string; name: string; slug: string } | null;
  service: { slug: string; name: string } | null;
}

const SOURCE_LABEL: Record<string, string> = {
  website: "Website form",
  whatsapp: "WhatsApp",
  google: "Google",
  in_person: "In person",
  email: "Email",
  other: "Other",
};

/** Staff testimonial form: real feedback received outside the website. */
function AddTestimonial({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [targets, setTargets] = useState<{ value: string; label: string }[]>([]);
  const [target, setTarget] = useState("");
  const [source, setSource] = useState("whatsapp");
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/sysuser/services").then((r) => r.json()).catch(() => ({})),
      fetch("/api/sysuser/products?light=1").then((r) => r.json()).catch(() => ({})),
    ]).then(([sv, pr]) => {
      const services = (sv.services ?? []) as { slug: string; name: string }[];
      const products = (pr.products ?? []) as { id: string; name: string }[];
      setTargets([
        ...services.map((x) => ({ value: `s:${x.slug}`, label: `Service · ${x.name}` })),
        ...products.map((x) => ({ value: `p:${x.id}`, label: `Product · ${x.name}` })),
      ]);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) {
      toast.error("Choose the product or service");
      return;
    }
    setSaving(true);
    const [kind, ref] = [target.slice(0, 1), target.slice(2)];
    const res = await fetch("/api/sysuser/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(kind === "s" ? { serviceSlug: ref } : { productId: ref }),
        source,
        rating: Number(rating),
        title,
        body,
        authorName,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Save failed");
      return;
    }
    toast.success("Testimonial added");
    setTitle("");
    setBody("");
    setAuthorName("");
    onSaved();
  };

  return (
    <Card
      title="Add a testimonial"
      description="For real feedback a customer gave you elsewhere (WhatsApp, Google, in person). Copy their words; it is published straight away with its source recorded."
    >
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <Field label="Product or service">
          <Select
            value={target}
            onChange={setTarget}
            options={[{ value: "", label: "— Choose —" }, ...targets]}
            searchable
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <Select
              value={source}
              onChange={setSource}
              options={Object.entries(SOURCE_LABEL)
                .filter(([k]) => k !== "website")
                .map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Rating">
            <Select
              value={rating}
              onChange={setRating}
              options={[5, 4, 3, 2, 1].map((n) => ({
                value: String(n),
                label: "★".repeat(n),
              }))}
            />
          </Field>
        </div>
        <Field label="Customer name">
          <TextInput
            required
            maxLength={80}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        </Field>
        <Field label="Title">
          <TextInput
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="What they said">
            <Textarea
              required
              rows={4}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" icon={<Plus size={12} />} disabled={saving}>
            {saving ? "Saving…" : "Add testimonial"}
          </Button>
        </div>
      </form>
    </Card>
  );
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
        description="Moderate customer reviews. Only approved reviews show on product and service pages."
      />

      <AddTestimonial onSaved={() => (filter === "pending" ? setFilter("approved") : reload())} />

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
        <div className="text-ink-soft">Loading…</div>
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
          description="Reviews submitted from product and service pages will land here."
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
                      <span className="text-ink-soft">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </span>
                    <Badge tone={r.isApproved ? "success" : "muted"}>
                      {r.isApproved ? "approved" : "pending"}
                    </Badge>
                    <Badge tone="muted">{SOURCE_LABEL[r.source] ?? r.source}</Badge>
                    <span className="text-xs text-ink-soft">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-display text-xl mb-1">{r.title}</h3>
                  <p className="text-sm text-ink whitespace-pre-wrap">
                    {r.body}
                  </p>
                  <div className="mt-3 text-xs text-ink-soft">
                    by <strong>{r.authorName}</strong>
                    {r.authorEmail && ` · ${r.authorEmail}`}
                    {" · on "}
                    {r.product ? (
                      <Link
                        href={`/sysuser/products/${r.product.id}`}
                        className="underline hover:text-metal-text"
                      >
                        {r.product.name}
                      </Link>
                    ) : r.service ? (
                      <Link
                        href={`/sysuser/services/${r.service.slug}`}
                        className="underline hover:text-metal-text"
                      >
                        {r.service.name}
                      </Link>
                    ) : null}
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
