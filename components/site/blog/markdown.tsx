import { renderMarkdown } from "@/lib/markdown";

export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="text-[var(--color-cream)] max-w-3xl prose-invert"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
