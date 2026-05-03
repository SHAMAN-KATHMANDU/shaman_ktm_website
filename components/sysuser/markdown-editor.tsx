"use client";

import { useRef, useState } from "react";
import { Textarea } from "./form";

interface Props {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}

/**
 * Plain-textarea markdown editor with a thin toolbar that wraps selected
 * text in inline marks or inserts block directives. Pairs with the project's
 * lib/markdown.ts which understands :::video[URL]::: blocks and YouTube/
 * Vimeo iframes.
 */
export function MarkdownEditor({ value, onChange, rows = 18, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

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

  const insertVideo = () => {
    const url = window.prompt("Paste a YouTube or Vimeo URL:");
    if (!url) return;
    replaceSelection(() => `\n\n:::video[${url.trim()}]:::\n\n`);
  };

  const insertImage = () => {
    const url = window.prompt("Image URL (uploads/… or full https://):");
    if (!url) return;
    const alt = window.prompt("Alt text (for screen readers):") ?? "";
    replaceSelection(
      () => `\n\n<img src="${url}" alt="${alt.replace(/"/g, "")}" />\n\n`,
    );
  };

  const togglePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    // Lazy-import the renderer (it's pure, runs fine on the client too).
    const { renderMarkdown } = await import("@/lib/markdown");
    setPreviewHtml(renderMarkdown(value));
    setShowPreview(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <ToolbarBtn onClick={() => replaceSelection((s) => `**${s || "bold"}**`)}>
          B
        </ToolbarBtn>
        <ToolbarBtn onClick={() => replaceSelection((s) => `_${s || "italic"}_`)}>
          I
        </ToolbarBtn>
        <ToolbarBtn onClick={() => replaceSelection((s) => `\n\n# ${s || "Heading"}\n\n`)}>
          H1
        </ToolbarBtn>
        <ToolbarBtn onClick={() => replaceSelection((s) => `\n\n## ${s || "Heading"}\n\n`)}>
          H2
        </ToolbarBtn>
        <ToolbarBtn onClick={() => replaceSelection((s) => `\n\n### ${s || "Heading"}\n\n`)}>
          H3
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            replaceSelection((s) =>
              s
                ? s
                    .split("\n")
                    .map((line) => `- ${line}`)
                    .join("\n")
                : "- Item one\n- Item two",
            )
          }
        >
          • List
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
        <ToolbarBtn onClick={togglePreview}>
          {showPreview ? "Edit" : "Preview"}
        </ToolbarBtn>
      </div>
      {showPreview ? (
        <div
          className="prose-admin min-h-[200px] rounded border border-[var(--color-border)] bg-[var(--color-base)] p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder ?? "Write in Markdown. Use ▶ Video to embed YouTube/Vimeo."}
          className="font-mono"
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface)]"
    >
      {children}
    </button>
  );
}
