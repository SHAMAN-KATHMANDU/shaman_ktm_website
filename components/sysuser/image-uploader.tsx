"use client";

import { useEffect, useRef, useState } from "react";
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

type QueueStatus = "pending" | "uploading" | "uploaded" | "error";

interface QueueItem {
  id: string;
  name: string;
  status: QueueStatus;
  error?: string;
}

interface UploadTask {
  item: QueueItem;
  file: File;
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function isAcceptableFile(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const fileType = (file.type || "").toLowerCase();
  const fileName = file.name.toLowerCase();
  return tokens.some((token) => {
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1);
      return fileType.startsWith(prefix);
    }
    if (token.startsWith(".")) return fileName.endsWith(token);
    return fileType === token;
  });
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      if (!item) continue;
      await worker(item);
    }
  });
  await Promise.all(workers);
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
  multiple = false,
}: {
  onUploaded: (publicUrl: string) => void;
  accept?: string;
  label?: string;
  multiple?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<MediaRow[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const dragDepthRef = useRef(0);

  const updateQueue = (id: string, patch: Partial<QueueItem>) => {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const uploadSingleFile = async (item: QueueItem, file: File) => {
    updateQueue(item.id, { status: "uploading", error: undefined });

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

    const dims = await readImageDimensions(file).catch(() => null);

    const confirmRes = await fetch("/api/sysuser/media/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: sign.key,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
      }),
    });
    if (!confirmRes.ok) {
      const j = (await confirmRes.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(j?.message ?? `Confirm failed: ${confirmRes.status}`);
    }

    updateQueue(item.id, { status: "uploaded", error: undefined });
    onUploaded(sign.publicUrl);
  };

  const handleFiles = async (incoming: File[]) => {
    const selected = multiple ? incoming : incoming.slice(0, 1);
    if (selected.length === 0) return;

    const accepted = selected.filter((file) => isAcceptableFile(file, accept));
    const rejected = selected.filter((file) => !isAcceptableFile(file, accept));

    const acceptedQueue: QueueItem[] = accepted.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      name: file.name,
      status: "pending",
    }));
    const acceptedTasks: UploadTask[] = acceptedQueue.map((item, idx) => ({
      item,
      file: accepted[idx]!,
    }));
    const rejectedQueue: QueueItem[] = rejected.map((file, idx) => ({
      id: `${Date.now()}-rejected-${idx}-${file.name}`,
      name: file.name,
      status: "error",
      error: "File type not allowed by this uploader",
    }));

    setQueue([...acceptedQueue, ...rejectedQueue]);
    setError(null);
    if (accepted.length === 0) return;

    setBusy(true);
    try {
      await runWithConcurrency(acceptedTasks, 3, async ({ item, file }) => {
        try {
          await uploadSingleFile(item, file);
        } catch (err) {
          const message = (err as Error).message;
          updateQueue(item.id, { status: "error", error: message });
          setError(message);
        }
      });
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
      <div
        className={`rounded-md border border-dashed p-3 transition ${
          dragOver
            ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
            : "border-[var(--color-border)] bg-[var(--color-base)]/40"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepthRef.current += 1;
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepthRef.current = 0;
          setDragOver(false);
          const dropped = Array.from(e.dataTransfer.files ?? []);
          if (dropped.length > 0) void handleFiles(dropped);
        }}
      >
        <div className="inline-flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="file"
              accept={accept}
              multiple={multiple}
              disabled={busy}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void handleFiles(files);
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
        <p className="mt-2 text-xs opacity-60">
          or drop {multiple ? "files" : "a file"} here
        </p>
      </div>
      {queue.length > 0 && (
        <ul className="space-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-2 text-xs">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <span className="opacity-60">
                {item.status === "error" ? item.error : item.status}
              </span>
            </li>
          ))}
        </ul>
      )}
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
