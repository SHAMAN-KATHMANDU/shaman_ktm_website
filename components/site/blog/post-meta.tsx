import type { BlogPostSummary } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export function PostMeta({
  post,
  minReadLabel,
  byLabel,
}: {
  post: BlogPostSummary;
  minReadLabel: string;
  byLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 label-nav text-[10px] text-ink-soft">
      <span className="text-metal-text">{post.category.name}</span>
      <span aria-hidden>·</span>
      <span>{formatDate(post.publishedAt)}</span>
      <span aria-hidden>·</span>
      <span>
        {post.readingMinutes} {minReadLabel}
      </span>
      <span aria-hidden>·</span>
      <span>
        {byLabel} {post.authorName}
      </span>
    </div>
  );
}
