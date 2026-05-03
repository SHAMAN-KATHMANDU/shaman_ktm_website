"use client";

import { useState } from "react";

interface SignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Direct browser → R2 upload via /api/sysuser/media/sign.
 * Calls onUploaded(publicUrl) once the PUT succeeds.
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

  return (
    <div className="space-y-1">
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
      {error && <div className="text-xs text-[var(--color-danger)]">{error}</div>}
    </div>
  );
}
