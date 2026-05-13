import { listBlogPosts, listProducts, listCategories } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SearchClient, type SearchEntry } from "./search-client";

export const metadata = {
  title: "Search — Shaman Kathmandu",
};

export default async function SearchPage() {
  const [{ products }, { posts }, categories] = await Promise.all([
    listProducts({ limit: 100 }),
    listBlogPosts({ limit: 100 }),
    listCategories(),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const entries: SearchEntry[] = [
    ...products.map((p) => ({
      type: "product" as const,
      title: p.name,
      href: `/products/${p.slug}`,
      tags: [
        ...(p.tags ?? []),
        ...(p.elementSlugs ?? []),
        ...(p.categoryId && catById.has(p.categoryId)
          ? [catById.get(p.categoryId)!]
          : []),
      ],
      thumbnail: p.thumbnailUrl,
    })),
    ...posts.map((p) => ({
      type: "story" as const,
      title: p.title,
      href: `/stories/${p.slug}`,
      tags: p.tags,
      thumbnail: p.heroImageUrl,
    })),
  ];

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1100px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Search" }]} />
        </section>
        <SearchClient entries={entries} />
      </SiteShell>
    </SiteProviders>
  );
}
