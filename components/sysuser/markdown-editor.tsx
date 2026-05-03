"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/field";
import { renderMarkdown } from "@/lib/markdown";
import { prompt as askPrompt } from "@/components/ui/prompt";

interface Props {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  /** When true, render the preview side-by-side rather than tabbed. */
  splitPreview?: boolean;
}

/**
 * Plain-textarea markdown editor with a thin toolbar that wraps selected
 * text in inline marks or inserts block directives. Pairs with the project's
 * lib/markdown.ts which understands :::video[URL]::: blocks and YouTube/
 * Vimeo iframes.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 18,
  placeholder,
  splitPreview = false,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview" | "split">(
    splitPreview ? "split" : "edit",
  );

  // Keep mode in sync if the parent flips splitPreview.
  useEffect(() => {
    if (splitPreview && mode === "edit") setMode("split");
    if (!splitPreview && mode === "split") setMode("edit");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitPreview]);

  const previewHtml = useMemo(() => renderMarkdown(value), [value]);

  const replaceSelection = (
    transform: (selected: string) => string,
    fallback?: string,
  ) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const selection = value.slice(start, end);
    const after = value.slice(end);
    const replacement = transform(selection || fallback || "");
    const next = `${before}${replacement}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = before.length + replacement.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const insertVideo = async () => {
    const url = await askPrompt({
      title: "Embed video",
      label: "YouTube or Vimeo URL",
      placeholder: "https://www.youtube.com/watch?v=…",
    });
    if (!url) return;
    replaceSelection(() => `\n\n:::video[${url.trim()}]:::\n\n`);
  };

  const insertImage = async () => {
    const url = await askPrompt({
      title: "Insert image",
      label: "Image URL",
      placeholder: "https://media.shamankathmandu.com/…",
    });
    if (!url) return;
    const alt = await askPrompt({
      title: "Alt text",
      label: "Description for screen readers",
    });
    replaceSelection(
      () => `\n\n<img src="${url}" alt="${(alt ?? "").replace(/"/g, "")}" />\n\n`,
    );
  };

  const editor = (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={
        placeholder ?? "Write in Markdown. Use ▶ Video to embed YouTube/Vimeo."
      }
      className="font-mono"
    />
  );

  const preview = (
    <div
      className="prose-admin min-h-[200px] rounded border border-[var(--color-border)] bg-[var(--color-base)] p-4 text-sm"
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <ToolbarBtn onClick={() => replaceSelection((s) => `**${s || "bold"}**`)}>
          B
        </ToolbarBtn>
        <ToolbarBtn onClick={() => replaceSelection((s) => `_${s || "italic"}_`)}>
          I
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => replaceSelection((s) => `\n\n# ${s || "Heading"}\n\n`)}
        >
          H1
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => replaceSelection((s) => `\n\n## ${s || "Heading"}\n\n`)}
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => replaceSelection((s) => `\n\n### ${s || "Heading"}\n\n`)}
        >
          H3
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            replaceSelection((s) =>
              s
                ? s.split("\n").map((line) => `- ${line}`).join("\n")
                : "- Item one\n- Item two",
            )
          }
        >
          • List
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => replaceSelection((s) => `> ${s || "Quote"}`)}
        >
          “ Quote
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            replaceSelection((s) => `[${s || "link text"}](https://)`)
          }
        >
          Link
        </ToolbarBtn>
        <ToolbarBtn onClick={insertImage}>Image</ToolbarBtn>
        <ToolbarBtn onClick={insertVideo}>▶ Video</ToolbarBtn>
        <div className="ml-auto" />
        <ToolbarBtn
          active={mode === "edit"}
          onClick={() => setMode("edit")}
        >
          Edit
        </ToolbarBtn>
        <ToolbarBtn
          active={mode === "split"}
          onClick={() => setMode("split")}
        >
          Split
        </ToolbarBtn>
        <ToolbarBtn
          active={mode === "preview"}
          onClick={() => setMode("preview")}
        >
          Preview
        </ToolbarBtn>
      </div>

      {mode === "edit" && editor}
      {mode === "preview" && preview}
      {mode === "split" && (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {editor}
          {preview}
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 transition ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-base)]"
          : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
      }`}
    >
      {children}
    </button>
  );
}
