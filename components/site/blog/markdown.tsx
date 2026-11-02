import { renderMarkdown } from "@/lib/markdown";

export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="text-ink max-w-3xl prose"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
