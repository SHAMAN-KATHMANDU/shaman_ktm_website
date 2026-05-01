import type { BlogPostSummary } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export function PostMeta({ post }: { post: BlogPostSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-4 label-nav text-[10px] text-[var(--color-gold-muted)]">
      <span className="text-[var(--color-gold)]">{post.category.name}</span>
      <span aria-hidden>·</span>
      <span>{formatDate(post.publishedAt)}</span>
      <span aria-hidden>·</span>
      <span>{post.readingMinutes} min read</span>
      <span aria-hidden>·</span>
      <span>By {post.authorName}</span>
    </div>
  );
}
