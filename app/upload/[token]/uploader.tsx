"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ALLOWED_MEDIA_MIME, MAX_DIRECT_UPLOAD_BYTES, getReadableFileSize } from "@/lib/cms/media-limits";
import type { UploadSessionView } from "@/lib/upload-sessions";

interface FileUploadProgress {
  id: string;
  filename: string;
  progress: number;
  error?: string;
  status: "pending" | "uploading" | "confirming" | "done" | "failed";
  // Which drop zone inside the card the file went to, and what's needed to retry it.
  zone: string;
  file: File;
  context: FileUploadContext;
}

interface UploadingSlot {
  slotId: string;
  uploads: FileUploadProgress[];
}

interface FileUploadContext {
  slotId: string;
  variationSku?: string; // products mode: variant to attach to
  variantLabel?: string; // draft mode: variant label to mark with
}

function zoneKey(c: { variationSku?: string | null; variantLabel?: string | null }): string {
  return c.variationSku ? `sku:${c.variationSku}` : c.variantLabel ? `label:${c.variantLabel}` : "gallery";
}

export function Uploader({
  token,
  initialSession,
}: {
  token: string;
  initialSession: UploadSessionView;
}) {
  const [session, setSession] = useState<UploadSessionView>(initialSession);
  const [uploadingBySlot, setUploadingBySlot] = useState<Map<string, UploadingSlot>>(new Map());
  // Cards start open — the point of the page is dropping photos into them.
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const uploadQueues = useRef<Map<string, Promise<void>>>(new Map());

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<string>("");
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(session.expiresAt);
      const diff = expiry.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 30000); // Update every 30s
    return () => clearInterval(timer);
  }, [session.expiresAt]);

  const handleFileSelect = useCallback(
    async (files: FileList, context: FileUploadContext) => {
      const slot = session.slots.find((s) => s.id === context.slotId);
      if (!slot) return;

      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Type check
        if (!ALLOWED_MEDIA_MIME.has(file.type)) {
          alert(`Unsupported file type: ${file.type}. Use images (JPEG, PNG, WebP, AVIF, GIF) or videos (MP4, WebM, MOV).`);
          continue;
        }

        // Size check
        if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
          alert(`File too large: ${file.name} (${getReadableFileSize(file.size)}). Max is ${getReadableFileSize(MAX_DIRECT_UPLOAD_BYTES)}.`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // Add to progress queue with variant context
      const slotUploads = uploadingBySlot.get(context.slotId) || { slotId: context.slotId, uploads: [] };
      const newUploads = validFiles.map((f, idx) => ({
        id: `${context.slotId}-${idx}-${Math.random().toString(36)}`,
        filename: f.name,
        progress: 0,
        status: "pending" as const,
        zone: zoneKey(context),
        file: f,
        context,
      }));
      slotUploads.uploads.push(...newUploads);
      setUploadingBySlot(new Map(uploadingBySlot.set(context.slotId, slotUploads)));

      // Process queue with 3 concurrent uploads per slot
      const queue = uploadQueues.current.get(context.slotId) || Promise.resolve();
      uploadQueues.current.set(context.slotId, queue.then(async () => {
        // Process 3 at a time
        for (let i = 0; i < newUploads.length; i += 3) {
          await Promise.all(
            newUploads.slice(i, i + 3).map((prog, idx) =>
              uploadFile(prog, validFiles[i + idx], context)
            )
          );
        }
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.slots, uploadingBySlot, token]
  );

  const uploadFile = async (prog: FileUploadProgress, file: File, context: FileUploadContext) => {
    const updateProgress = (update: Partial<FileUploadProgress>) => {
      setUploadingBySlot((prev) => {
        const map = new Map(prev);
        const slot = map.get(context.slotId);
        if (!slot) return prev;
        slot.uploads = slot.uploads.map((u) =>
          u.id === prog.id ? { ...u, ...update } : u
        );
        return map;
      });
    };

    try {
      updateProgress({ status: "uploading", progress: 0 });

      // Step 1: Sign
      const signRes = await fetch(`/api/upload/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: context.slotId,
          filename: file.name,
          contentType: file.type,
          bytes: file.size,
        }),
      });

      if (!signRes.ok) {
        const err = await signRes.json();
        throw new Error(err.message || "Failed to sign upload");
      }

      const { uploadUrl, key } = await signRes.json();

      // Step 2: PUT to S3 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateProgress({ progress: percent });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      updateProgress({ status: "confirming", progress: 100 });

      // Step 3: Confirm with variant context
      // No alt from the client: a camera-roll filename ("IMG_1234.jpg") is
      // worse than the product/variant name the server fills in.
      const confirmBody = {
        slotId: context.slotId,
        key,
        ...(context.variationSku ? { variationSku: context.variationSku } : {}),
        ...(context.variantLabel ? { variantLabel: context.variantLabel } : {}),
      };

      const confirmRes = await fetch(`/api/upload/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmBody),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.message || "Failed to confirm upload");
      }

      const { session: updatedSession } = await confirmRes.json();
      setSession(updatedSession);

      updateProgress({ status: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      updateProgress({ status: "failed", error: message });
    }
  };

  const handleAddVariant = async (slotId: string, label: string, color?: string, size?: string) => {
    try {
      const res = await fetch(`/api/upload/${token}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, label, color, size }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add variant");
      }

      const { session: updatedSession } = await res.json();
      setSession(updatedSession);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding variant");
    }
  };

  const handleAddSlot = async () => {
    try {
      const res = await fetch(`/api/upload/${token}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add slot");
      }

      const { session: updatedSession } = await res.json();
      setSession(updatedSession);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error adding product slot");
    }
  };

  const handleRenameSlot = async (slotId: string, name: string | null) => {
    try {
      const res = await fetch(`/api/upload/${token}/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to rename slot");
      }

      const { session: updatedSession } = await res.json();
      setSession(updatedSession);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error renaming product");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/upload/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit");
      }

      const { session: updatedSession } = await res.json();
      setSession(updatedSession);
      setIsDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error submitting");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPhotos = session.slots.reduce((sum, slot) => sum + slot.files.length, 0);

  if (isDone) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink mb-2">Done</h1>
          <p className="text-sm text-ink/70">
            Tell the assistant in chat that you&apos;ve finished uploading photos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink mb-1">Upload Photos</h1>
        {session.note && <p className="text-sm text-ink/60">{session.note}</p>}
      </div>

      <div className="space-y-4 flex-1">
        {session.slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            token={token}
            isExpanded={!collapsedSlots.has(slot.id)}
            onToggle={() => {
              const newSet = new Set(collapsedSlots);
              if (newSet.has(slot.id)) {
                newSet.delete(slot.id);
              } else {
                newSet.add(slot.id);
              }
              setCollapsedSlots(newSet);
            }}
            uploads={uploadingBySlot.get(slot.id)?.uploads || []}
            onFileSelect={(files) =>
              handleFileSelect(files, { slotId: slot.id })
            }
            onRetry={(prog) =>
              uploadFile({ ...prog, error: undefined }, prog.file, prog.context)
            }
            onAddVariant={handleAddVariant}
            onRenameSlot={session.mode === "draft" ? handleRenameSlot : undefined}
            sessionMode={session.mode}
          />
        ))}
      </div>

      {session.mode === "draft" && (
        <button
          onClick={handleAddSlot}
          className="mt-4 px-4 py-2 bg-ink text-bone rounded hover:bg-ink/80 transition"
        >
          + Add Product
        </button>
      )}

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-3 border-t border-ink/10 bg-bone flex items-center justify-between gap-3">
        <div className="text-sm text-ink/60">
          {totalPhotos} photos uploaded · expires in {timeLeft}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-ink text-bone rounded font-medium hover:bg-ink/80 disabled:opacity-50 transition"
        >
          {isSubmitting ? "Submitting..." : "Done"}
        </button>
      </div>
    </div>
  );
}

interface SlotCardProps {
  slot: UploadSessionView["slots"][0];
  token: string;
  isExpanded: boolean;
  onToggle: () => void;
  uploads: FileUploadProgress[];
  onFileSelect: (files: FileList, context: FileUploadContext) => void;
  onRetry: (upload: FileUploadProgress) => void;
  onAddVariant: (slotId: string, label: string, color?: string, size?: string) => Promise<void>;
  onRenameSlot?: (slotId: string, name: string | null) => Promise<void>;
  sessionMode: UploadSessionView["mode"];
}

function SlotCard({
  slot,
  token,
  isExpanded,
  onToggle,
  uploads,
  onFileSelect,
  onRetry,
  onAddVariant,
  onRenameSlot,
  sessionMode,
}: SlotCardProps) {
  const zoneProps = (zone: string) => ({
    uploads: uploads.filter((u) => u.zone === zone),
    thumbnails: slot.files
      .filter((f) => zoneKey(f) === zone)
      .map((f) => f.url),
    onRetry,
  });
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newVariantColor, setNewVariantColor] = useState("");
  const [newVariantSize, setNewVariantSize] = useState("");
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [slotName, setSlotName] = useState(slot.name || "");

  const handleAddVariant = async () => {
    if (!newVariantLabel.trim()) return;
    setIsAddingVariant(true);
    try {
      await onAddVariant(slot.id, newVariantLabel, newVariantColor || undefined, newVariantSize || undefined);
      setNewVariantLabel("");
      setNewVariantColor("");
      setNewVariantSize("");
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleRenameSlot = async () => {
    if (onRenameSlot && slotName !== slot.name) {
      await onRenameSlot(slot.id, slotName || null);
    }
  };

  const isMedia = sessionMode === "media";
  const productName = isMedia
    ? slot.hint || `Photos ${slot.position + 1}`
    : slot.product
    ? slot.product.name
    : slotName
    ? slotName
    : `Product ${slot.position + 1}`;

  return (
    <div className="border border-ink/20 rounded-lg overflow-hidden">
      <div
        onClick={onToggle}
        className="bg-bone/50 p-4 cursor-pointer flex items-center justify-between hover:bg-bone/75 transition"
      >
        <div className="flex items-center gap-3 flex-1">
          {slot.product?.thumbnailUrl && (
            <img
              src={slot.product.thumbnailUrl}
              alt={slot.product.name}
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div>
            {sessionMode === "draft" && onRenameSlot && !slot.product ? (
              <input
                type="text"
                value={slotName}
                onChange={(e) => setSlotName(e.target.value)}
                onBlur={handleRenameSlot}
                onClick={(e) => e.stopPropagation()}
                placeholder="Product name (optional)"
                className="block font-medium text-ink bg-transparent border-b border-ink/30 focus:outline-none focus:border-ink mb-1 w-full"
              />
            ) : (
              <h3 className="font-medium text-ink">{productName}</h3>
            )}
            {slot.hint && !isMedia && <p className="text-xs text-ink/60">{slot.hint}</p>}
            <p className="text-xs text-ink/50">
              {slot.files.length} {isMedia && !slot.targeted ? "files" : "photos"}
            </p>
          </div>
        </div>
        <div className="text-xl text-ink/60">{isExpanded ? "−" : "+"}</div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white/30">
          {/* Product photos zone (media mode: the one zone for this spot) */}
          <UploadZone
            label={
              !isMedia
                ? "Product photos"
                : slot.targeted
                ? "Choose a photo (the newest one is used)"
                : "Photos & videos"
            }
            accept={isMedia && slot.targeted ? "image/*" : undefined}
            onFileSelect={(files) =>
              onFileSelect(files, { slotId: slot.id })
            }
            {...zoneProps("gallery")}
          />

          {/* Variant zones (products mode) */}
          {sessionMode === "products" &&
            slot.product?.variations.map((variation) => (
              <UploadZone
                key={variation.id}
                label={variation.label || variation.sku}
                onFileSelect={(files) =>
                  onFileSelect(files, {
                    slotId: slot.id,
                    variationSku: variation.sku,
                  })
                }
                {...zoneProps(zoneKey({ variationSku: variation.sku }))}
              />
            ))}

          {/* Draft mode: variant labels as zones */}
          {sessionMode === "draft" &&
            slot.variantLabels.map((label: string) => (
              <UploadZone
                key={label}
                label={label}
                onFileSelect={(files) =>
                  onFileSelect(files, {
                    slotId: slot.id,
                    variantLabel: label,
                  })
                }
                {...zoneProps(zoneKey({ variantLabel: label }))}
              />
            ))}

          {/* Add variant form (products / draft only) */}
          {!isMedia && (
          <div className="bg-ink/5 p-3 rounded border border-ink/10">
            <div className="text-sm font-medium text-ink mb-2">Add Variant</div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Label (required, e.g. Blue / Large)"
                value={newVariantLabel}
                onChange={(e) => setNewVariantLabel(e.target.value)}
                className="w-full px-3 py-2 border border-ink/20 rounded text-sm focus:outline-none focus:border-ink"
              />
              {sessionMode === "products" && (
              <>
              <input
                type="text"
                placeholder="Color (optional)"
                value={newVariantColor}
                onChange={(e) => setNewVariantColor(e.target.value)}
                className="w-full px-3 py-2 border border-ink/20 rounded text-sm focus:outline-none focus:border-ink"
              />
              <input
                type="text"
                placeholder="Size (optional)"
                value={newVariantSize}
                onChange={(e) => setNewVariantSize(e.target.value)}
                className="w-full px-3 py-2 border border-ink/20 rounded text-sm focus:outline-none focus:border-ink"
              />
              <p className="text-xs text-ink/60">Price copies the product price</p>
              </>
              )}
              <button
                onClick={handleAddVariant}
                disabled={!newVariantLabel.trim() || isAddingVariant}
                className="w-full px-3 py-2 bg-ink text-bone rounded text-sm font-medium hover:bg-ink/80 disabled:opacity-50 transition"
              >
                {isAddingVariant ? "Adding..." : "Add Variant"}
              </button>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadZone({
  label,
  accept = "image/*,video/*",
  onFileSelect,
  uploads,
  thumbnails,
  onRetry,
}: {
  label: string;
  accept?: string;
  onFileSelect: (files: FileList) => void; // FileList + context handled by caller
  uploads: FileUploadProgress[];
  thumbnails: string[];
  onRetry: (upload: FileUploadProgress) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        onFileSelect(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
        isDragging ? "bg-ink/10 border-ink" : "bg-white/20 border-ink/20 hover:border-ink/40"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => e.target.files && onFileSelect(e.target.files)}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-sm font-medium text-ink/70 hover:text-ink transition"
      >
        {label}
      </button>
      <p className="text-xs text-ink/50 mt-1">Drag and drop or click to select</p>

      {thumbnails.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {thumbnails.map((url) =>
            /\.(mp4|webm|mov)$/i.test(url) ? (
              <video key={url} src={url} className="aspect-square w-full rounded object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="aspect-square w-full rounded object-cover" />
            ),
          )}
        </div>
      )}

      {/* Progress items (finished ones show as thumbnails above) */}
      {uploads.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploads.filter((u) => u.status !== "done").map((upload) => (
            <div key={upload.id} className="text-left text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-ink/70 truncate">{upload.filename}</span>
                {upload.status === "done" && <span className="text-green-600">✓</span>}
                {upload.status === "failed" && <span className="text-red-600">✕</span>}
              </div>
              {upload.status !== "done" && upload.status !== "failed" && (
                <div className="w-full bg-ink/10 rounded h-1">
                  <div
                    className="bg-ink h-full rounded transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.error && <p className="text-red-600 text-xs mt-1">{upload.error}</p>}
              {upload.status === "failed" && (
                <button
                  type="button"
                  onClick={() => onRetry(upload)}
                  className="mt-1 text-xs font-medium text-ink underline"
                >
                  Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
