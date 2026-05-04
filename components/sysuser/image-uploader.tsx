"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";

interface SignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

interface MediaRow {
  id: string;
  key: string;
  url: string;
  mime: string;
  bytes: number;
}

/**
 * Direct browser → R2 upload via /api/sysuser/media/sign, plus a
 * "Pick from library" drawer that browses existing /api/sysuser/media.
 * Calls onUploaded(publicUrl) when either path resolves.
 */
export function ImageUploader({
  onUploaded,
  accept = "image/*",
  label = "Upload",
}: {
  onUploaded: (publicUrl: string) => void;
  accept?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<MediaRow[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [search, setSearch] = useState("");

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const signRes = await fetch("/api/sysuser/media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          bytes: file.size,
        }),
      });
      if (!signRes.ok) throw new Error(`Sign failed: ${signRes.status}`);
      const sign = (await signRes.json()) as SignResponse;
      const putRes = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
      onUploaded(sign.publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Restrict the picker to the same mime family the uploader accepts.
  // accept="image/*" → mimeFilter="image"; accept="video/*" → "video".
  const mimeFilter = accept.split(",")[0]?.split("/")[0] ?? "";

  useEffect(() => {
    if (!pickerOpen) return;
    setLibraryLoading(true);
    const params = new URLSearchParams({ pageSize: "100" });
    if (mimeFilter) params.set("mime", mimeFilter);
    if (search) params.set("q", search);
    fetch(`/api/sysuser/media?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setLibrary(j.media ?? []))
      .catch(() => setLibrary([]))
      .finally(() => setLibraryLoading(false));
  }, [pickerOpen, mimeFilter, search]);

  const pick = (url: string) => {
    onUploaded(url);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-1">
      <div className="inline-flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="file"
            accept={accept}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
            className="hidden"
          />
          <span className="rounded border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-surface)]">
            {busy ? "Uploading…" : label}
          </span>
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-surface)]"
        >
          Pick from library
        </button>
      </div>
      {error && <div className="text-xs text-[var(--color-danger)]">{error}</div>}

      <Drawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Pick from library"
        description="Existing files uploaded to /sysuser/media. Click one to use it here."
      >
        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, URL or alt…"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:outline-none"
          />
          {libraryLoading ? (
            <div className="py-12 text-center text-xs opacity-60">Loading…</div>
          ) : library.length === 0 ? (
            <div className="py-12 text-center text-xs opacity-60">
              No matching files. Upload one with the button on the left.
            </div>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {library.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pick(m.url)}
                  className="group overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition hover:border-[var(--color-gold)]"
                  title={m.key}
                >
                  {m.mime.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-[var(--color-base)] p-3 text-[10px] opacity-60">
                      {m.mime}
                    </div>
                  )}
                  <div className="truncate p-1.5 text-[10px] opacity-70">
                    {m.key.split("/").pop()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
