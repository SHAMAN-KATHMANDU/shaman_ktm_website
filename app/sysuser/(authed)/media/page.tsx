"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";
import { ImageUploader } from "@/components/sysuser/image-uploader";

interface Row {
  id: string;
  key: string;
  url: string;
  mime: string;
  bytes: number;
  createdAt: string;
}

export default function MediaPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/media");
    const j = await res.json();
    setRows(j.media ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this file from R2?")) return;
    await fetch(`/api/sysuser/media/${id}`, { method: "DELETE" });
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Media</h1>
        <ImageUploader
          accept="image/*,video/*"
          label="+ Upload"
          onUploaded={() => reload()}
        />
      </div>
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              {m.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square w-full bg-[var(--color-base)] p-3 text-xs opacity-60">
                  {m.mime}
                </div>
              )}
              <div className="p-2 text-xs">
                <div className="truncate opacity-70" title={m.key}>
                  {m.key}
                </div>
                <div className="opacity-50">
                  {(m.bytes / 1024).toFixed(0)} KB
                </div>
                <div className="mt-2 flex justify-between">
                  <button
                    className="text-[var(--color-gold)]"
                    onClick={() => navigator.clipboard.writeText(m.url)}
                  >
                    Copy URL
                  </button>
                  <button
                    className="text-[var(--color-danger)]"
                    onClick={() => remove(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
