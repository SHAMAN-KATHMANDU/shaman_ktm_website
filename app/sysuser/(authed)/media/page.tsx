"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Trash2, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { Drawer } from "@/components/ui/drawer";
import { useDebounce } from "@/components/ui/use-debounce";
import { useToast } from "@/components/ui/toast";

interface Row {
  id: string;
  key: string;
  url: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
}

const MIME_FILTERS = [
  { value: "", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
] as const;

const PAGE_SIZE = 60;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [mime, setMime] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (mime) params.set("mime", mime);
      const res = await fetch(`/api/sysuser/media?${params.toString()}`);
      const j = await res.json();
      setRows(j.media ?? []);
      setTotal(j.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, mime]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, mime]);

  const remove = async (id: string) => {
    if (!confirm("Delete this file from R2? This cannot be undone.")) return;
    const res = await fetch(`/api/sysuser/media/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    if (selected?.id === id) setSelected(null);
    reload();
  };

  const copyUrl = async (row: Row) => {
    await navigator.clipboard.writeText(row.url);
    setCopiedId(row.id);
    setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 1200);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Media library</h1>
          <p className="text-xs opacity-60">
            {total} file{total === 1 ? "" : "s"} · uploads go to R2 and are
            available everywhere via &ldquo;Pick from library&rdquo;.
          </p>
        </div>
        <ImageUploader
          accept="image/*,video/*"
          label="+ Upload"
          onUploaded={() => {
            toast.success("Uploaded");
            setPage(1);
            reload();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2">
          <Search size={14} className="opacity-50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, URL, or alt text…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="opacity-50 hover:opacity-100"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {MIME_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setMime(f.value)}
              className={`rounded-md border px-3 py-2 text-xs transition ${
                mime === f.value
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "border-[var(--color-border)] opacity-70 hover:opacity-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center text-sm opacity-60">
          {debouncedSearch || mime
            ? "No files match those filters."
            : "No files uploaded yet. Hit + Upload to add one."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {rows.map((m) => (
            <div
              key={m.id}
              className="group overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-gold)]"
            >
              <button
                type="button"
                onClick={() => setSelected(m)}
                className="block w-full"
                title={m.alt ?? m.key}
              >
                {m.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.alt ?? ""}
                    className="aspect-square w-full object-cover"
                  />
                ) : m.mime.startsWith("video/") ? (
                  <video
                    src={m.url}
                    className="aspect-square w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-[var(--color-base)] p-3 text-xs opacity-60">
                    {m.mime}
                  </div>
                )}
              </button>
              <div className="p-2 text-[11px]">
                <div className="truncate opacity-80" title={m.key}>
                  {m.key.split("/").pop()}
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <span>{formatBytes(m.bytes)}</span>
                  {m.width && m.height && (
                    <span>
                      {m.width}×{m.height}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <button
                    className="inline-flex items-center gap-1 text-[var(--color-gold)] hover:opacity-80"
                    onClick={() => copyUrl(m)}
                    title="Copy URL"
                  >
                    {copiedId === m.id ? <Check size={11} /> : <Copy size={11} />}
                    {copiedId === m.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    className="text-[var(--color-danger)] hover:opacity-80"
                    onClick={() => remove(m.id)}
                    aria-label="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs disabled:opacity-30"
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span className="text-xs opacity-60">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs disabled:opacity-30"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}

      {selected && (
        <DetailPanel
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={(next) => {
            setRows((rs) => rs.map((r) => (r.id === next.id ? next : r)));
            setSelected(next);
          }}
          onDelete={() => remove(selected.id)}
        />
      )}
    </div>
  );
}

function DetailPanel({
  row,
  onClose,
  onSaved,
  onDelete,
}: {
  row: Row;
  onClose: () => void;
  onSaved: (next: Row) => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const [alt, setAlt] = useState(row.alt ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Whenever a different row is selected, re-sync the local alt buffer.
  useEffect(() => {
    setAlt(row.alt ?? "");
  }, [row.id, row.alt]);

  const dirty = useMemo(() => alt !== (row.alt ?? ""), [alt, row.alt]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sysuser/media/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: alt || null }),
      });
      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      const j = (await res.json()) as { media: Row };
      toast.success("Saved");
      onSaved(j.media);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(row.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Drawer
      open={true}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={row.key.split("/").pop() ?? "File"}
      description={row.mime}
      width="xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-1.5 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20"
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded bg-[var(--color-gold)] px-4 py-1.5 text-xs font-medium text-[var(--color-base)] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-base)]">
          {row.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.url}
              alt={alt}
              className="max-h-[50vh] w-full object-contain"
            />
          ) : row.mime.startsWith("video/") ? (
            <video
              src={row.url}
              controls
              className="max-h-[50vh] w-full"
            />
          ) : (
            <div className="p-12 text-center text-xs opacity-60">
              No preview for {row.mime}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Stat label="Size" value={formatBytes(row.bytes)} />
          <Stat
            label="Dimensions"
            value={
              row.width && row.height ? `${row.width} × ${row.height}` : "—"
            }
          />
          <Stat label="Type" value={row.mime} />
          <Stat
            label="Uploaded"
            value={new Date(row.createdAt).toLocaleString()}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider opacity-60">
            URL
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={row.url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 font-mono text-xs"
            />
            <button
              onClick={copyUrl}
              className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-2 text-xs hover:bg-[var(--color-base)]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider opacity-60">
            Storage key
          </label>
          <code className="block break-all rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 font-mono text-xs opacity-80">
            {row.key}
          </code>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider opacity-60">
            Alt text
          </label>
          <textarea
            rows={2}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image for screen readers and SEO."
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>
    </Drawer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider opacity-60">
        {label}
      </div>
      <div className="mt-0.5 break-all text-[var(--color-cream)]">{value}</div>
    </div>
  );
}
