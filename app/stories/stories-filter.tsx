"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { BlogCategory, BlogPostSummary } from "@/lib/api/types";
import { listBlogPosts } from "@/lib/api";
import { splitLocale, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { StoryCard } from "@/components/site/cards/story-card";

interface Props {
  initialPosts: BlogPostSummary[];
  categories: BlogCategory[];
  locale: Locale;
}

export function StoriesFilter({ initialPosts, categories, locale: initialLocale }: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const [active, setActive] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listBlogPosts({ categorySlug: active, limit: 24 }, locale)
      .then((res) => {
        if (!cancelled) setPosts(res.posts);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, locale]);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          type="button"
          onClick={() => setActive(undefined)}
          className={`label-nav text-[10px] px-3 py-2 border transition-colors ${
            !active
              ? "border-[var(--color-gold)] text-[var(--color-gold)]"
              : "border-[var(--color-border)] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
          }`}
        >
          {t.common.all} ({initialPosts.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setActive(c.slug)}
            className={`label-nav text-[10px] px-3 py-2 border transition-colors ${
              active === c.slug
                ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                : "border-[var(--color-border)] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
            }`}
          >
            {c.name} ({c.postCount})
          </button>
        ))}
      </div>
      {posts.length === 0 ? (
        <p className="py-20 text-center text-[var(--color-gold-muted)]">
          {t.emptyStates.noStoriesInCategory}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => (
            <StoryCard key={p.id} post={p} />
          ))}
        </div>
      )}
      {loading && (
        <p className="text-center label-nav text-[10px] text-[var(--color-gold-muted)] mt-6">
          {t.common.loading}
        </p>
      )}
    </>
  );
}
