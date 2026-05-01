import { notFound } from "next/navigation";
import { getPage, listPages } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Markdown } from "@/components/site/blog/markdown";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const pages = await listPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const page = await getPage(slug);
    return {
      title: page.seoTitle ?? `${page.title} — Shaman Kathmandu`,
      description: page.seoDescription ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  let page;
  try {
    page = await getPage(slug);
  } catch {
    notFound();
  }
  return (
    <SiteProviders>
      <SiteShell>
        <article className="px-6 md:px-10 mx-auto max-w-[900px]">
          <div className="pt-10 pb-6">
            <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: page.title }]} />
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
