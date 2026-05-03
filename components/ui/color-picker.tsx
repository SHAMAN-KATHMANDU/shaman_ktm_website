"use client";

// Proper color picker — NOT the browser default.
// HSL gradient + hue slider + hex input + preset swatches + recent colors.

import { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";

const SHAMAN_PRESETS = [
  "#c4a35a", // gold
  "#9b8b6e", // metal
  "#6b5e3a", // earth
  "#3d5a2e", // wood
  "#4a6741", // plant
  "#2a5a6b", // water
  "#4a5270", // air
  "#0a0806", // base
  "#1f180a", // surface
  "#f5edd8", // cream
  "#4a8560", // success
  "#b45353", // danger
  "#ffffff",
  "#000000",
];

const RECENT_KEY = "sk-color-picker-recent";

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return [0, 0, 0];
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const commit = (hex: string) => {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : value;
    onChange(normalized);
    if (typeof window !== "undefined") {
      const next = [normalized, ...recent.filter((c) => c !== normalized)].slice(0, 10);
      setRecent(next);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
    }
  };

  const [h, s, l] = hexToHsl(value || "#000000");

  const eyedrop = async () => {
    interface EyeDropperResult {
      sRGBHex: string;
    }
    interface EyeDropperCtor {
      new (): { open(): Promise<EyeDropperResult> };
    }
    const eyeDropper = (window as unknown as { EyeDropper?: EyeDropperCtor })
      .EyeDropper;
    if (!eyeDropper) return;
    try {
      const result = await new eyeDropper().open();
      commit(result.sRGBHex);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-2 text-sm transition hover:border-[var(--color-gold)]/50"
      >
        <span
          className="h-6 w-10 rounded border border-[var(--color-border)]"
          style={{ background: value }}
        />
        <span className="font-mono text-xs uppercase">{value || "—"}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-2xl">
          <div className="mb-3 space-y-2">
            <div
              className="h-24 w-full rounded"
              style={{
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
              }}
            />
            <input
              type="range"
              min={0}
              max={360}
              value={h}
              onChange={(e) => commit(hslToHex(Number(e.target.value), s || 70, l || 50))}
              className="w-full"
              style={{
                background:
                  "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
                appearance: "none",
                height: 8,
                borderRadius: 4,
              }}
            />
          </div>

          <div className="mb-3 flex gap-2">
            <input
              value={value}
              onChange={(e) => commit(e.target.value)}
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1 font-mono text-xs uppercase focus:border-[var(--color-gold)] focus:outline-none"
            />
            <button
              type="button"
              onClick={eyedrop}
              title="Eyedropper"
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border)] hover:bg-[var(--color-base)]"
            >
              <Pipette size={12} />
            </button>
          </div>

          <div className="mb-2 text-[10px] uppercase tracking-wider opacity-50">
            Brand presets
          </div>
          <div className="mb-3 grid grid-cols-7 gap-1">
            {SHAMAN_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => commit(c)}
                title={c}
                className="h-6 w-full rounded border border-[var(--color-border)] transition hover:scale-110"
                style={{ background: c }}
              />
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <div className="mb-2 text-[10px] uppercase tracking-wider opacity-50">
                Recent
              </div>
              <div className="grid grid-cols-7 gap-1">
                {recent.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => commit(c)}
                    title={c}
                    className="h-6 w-full rounded border border-[var(--color-border)] hover:scale-110"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
