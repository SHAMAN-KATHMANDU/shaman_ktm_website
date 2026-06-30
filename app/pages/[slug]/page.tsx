import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Markdown } from "@/components/site/blog/markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const row = await prisma.page
    .findUnique({
      where: { slug },
      select: {
        title: true,
        seoTitle: true,
        seoDescription: true,
        ogImageUrl: true,
        canonicalUrl: true,
        noindex: true,
        twitterCard: true,
      },
    })
    .catch(() => null);
  if (!row) return {};
  return buildMetadata({
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    twitterCard: row.twitterCard,
    fallbackTitle: `${row.title} — Shaman Kathmandu`,
    path: locale === "ne" ? `/ne/pages/${slug}` : `/pages/${slug}`,
  });
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await (await import("@/lib/i18n/getDictionary")).getDictionary(locale);
  let page;
  try {
    page = await getPage(slug, locale);
  } catch {
    notFound();
  }
  return (
    <SiteProviders>
      <SiteShell>
        <article className="px-6 md:px-10 mx-auto max-w-[900px]">
          <div className="pt-10 pb-6">
            <Breadcrumbs items={[{ href: "/", label: t.breadcrumbs.home }, { label: page.title }]} />
          </div>
          <header className="py-8">
            <h1 className="display-heading font-display text-4xl md:text-6xl text-[var(--color-cream)] leading-tight mb-6">
              {page.title}
            </h1>
          </header>
          <div className="pb-20">
            <Markdown source={page.bodyMarkdown} />
          </div>
        </article>
      </SiteShell>
    </SiteProviders>
  );
}
