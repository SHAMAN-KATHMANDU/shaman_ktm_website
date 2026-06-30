"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

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

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-8">
      <h1 className="font-display text-4xl text-[var(--color-cream)] mb-6">
        {t.search.title}
      </h1>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.search.placeholder}
        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-4 text-[var(--color-cream)] mb-8"
        autoFocus
      />
      <p className="label-eyebrow mb-6">
        {q ? `${results.length} ${t.search.results}` : t.search.browsePrompt}
      </p>
      {results.length === 0 ? (
        <p className="py-20 text-center text-[var(--color-gold-muted)]">
          {t.search.noMatches}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {results.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="group flex gap-3 items-start p-3 border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] bg-[var(--color-surface)] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.thumbnail}
                  alt=""
                  className="w-16 h-20 object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="label-eyebrow mb-1">{r.type}</p>
                  <p className="font-display font-medium text-lg text-[var(--color-cream)] group-hover:text-[var(--color-gold)] line-clamp-2 leading-tight">
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
