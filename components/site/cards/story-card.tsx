import Link from "next/link";
import Image from "next/image";
import type { BlogPostSummary } from "@/lib/api/types";
import { PlayIcon } from "@/components/site/icons";
import { formatDate } from "@/lib/format";

interface Props {
  post: BlogPostSummary;
}

const elementFromTags = (tags: string[]): string | undefined => {
  const t = tags.find((x) => x.startsWith("element:"));
  return t ? t.slice("element:".length) : undefined;
};

export function StoryCard({ post }: Props) {
  const element = elementFromTags(post.tags);
  return (
    <Link
      href={`/stories/${post.slug}`}
      data-element={element}
      className="group block bg-surface border border-line hover:border-metal rounded-card transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden bg-cream">
        {post.heroImageUrl && (
          <Image
            src={post.heroImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 450px"
            loading="lazy"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-14 h-14 rounded-full border border-metal flex items-center justify-center text-bone bg-black/40">
            <PlayIcon size={20} />
          </span>
        </div>
      </div>
      <div className="p-5">
        <p className="label-eyebrow mb-2 text-accent-deep">
          {post.category.name}
        </p>
        <h3 className="font-display text-xl text-ink leading-tight mb-3 line-clamp-2">
          {post.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-ink-soft">
          <span>{formatDate(post.publishedAt)}</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      </div>
    </Link>
  );
}
