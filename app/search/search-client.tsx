"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { trackSearch } from "@/lib/pixel";

export interface SearchEntry {
  type: "product" | "story";
  title: string;
  href: string;
  tags: string[];
  thumbnail: string;
}

interface Props {
  entries: SearchEntry[];
}

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const score = (entry: SearchEntry, query: string): number => {
  if (!query) return 0;
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const haystack = `${entry.title} ${entry.tags.join(" ")}`.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (entry.title.toLowerCase().includes(t)) s += 5;
    if (haystack.includes(t)) s += 1;
  }
  return s;
};

export function SearchClient({ entries }: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return entries.slice(0, 12);
    return entries
      .map((e) => ({ e, s: score(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.e);
  }, [q, entries]);

  // Meta Pixel Search — debounced so it fires once the user pauses typing,
  // not on every keystroke.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const id = setTimeout(() => trackSearch(query), 800);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-8">
      <h1 className="font-display text-4xl text-ink mb-6">
        {t.search.title}
      </h1>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.search.placeholder}
        className="w-full bg-surface border border-line focus:border-metal outline-none px-4 py-4 text-ink mb-8"
        autoFocus
      />
      <p className="label-eyebrow mb-6">
        {q ? `${results.length} ${t.search.results}` : t.search.browsePrompt}
      </p>
      {results.length === 0 ? (
        <p className="py-20 text-center text-ink-soft">
          {t.search.noMatches}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {results.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="group flex gap-3 items-start p-3 border border-line hover:border-metal bg-surface transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.thumbnail}
                  alt=""
                  className="w-16 h-20 object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="label-eyebrow mb-1">
                    {r.type === "product" ? t.search.typeProduct : t.search.typeStory}
                  </p>
                  <p className="font-display font-medium text-lg text-ink group-hover:text-metal-text line-clamp-2 leading-tight">
                    {r.title}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
