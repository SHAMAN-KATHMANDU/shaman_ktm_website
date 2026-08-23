import { listBlogPosts, listProducts, listCategories } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SearchClient, type SearchEntry } from "./search-client";
import {
  fetchAllPages,
  POST_PAGE_SIZE,
  PRODUCT_PAGE_SIZE,
} from "./paging";

export const metadata = {
  title: "Search — Shaman Kathmandu",
  description:
    "Search the Shaman Kathmandu catalogue — singing bowls, bracelets, statues and stories.",
};

export default async function SearchPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const [products, posts, categories] = await Promise.all([
    fetchAllPages(
      (page) => listProducts({ limit: PRODUCT_PAGE_SIZE, page }),
      (res) => res.products,
      PRODUCT_PAGE_SIZE,
    ),
    fetchAllPages(
      (page) => listBlogPosts({ limit: POST_PAGE_SIZE, page }),
      (res) => res.posts,
      POST_PAGE_SIZE,
    ),
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
          <Breadcrumbs
            items={[
              { href: "/", label: t.breadcrumbs.home },
              { label: t.breadcrumbs.search },
            ]}
          />
        </section>
        <SearchClient entries={entries} />
      </SiteShell>
    </SiteProviders>
  );
}
