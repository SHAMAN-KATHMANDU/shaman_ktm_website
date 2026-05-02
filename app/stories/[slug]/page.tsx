import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, listBlogPosts, listProducts } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Markdown } from "@/components/site/blog/markdown";
import { PostMeta } from "@/components/site/blog/post-meta";
import { StoryCard } from "@/components/site/cards/story-card";
import { ProductCard } from "@/components/site/cards/product-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { posts } = await listBlogPosts({ limit: 100 });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const { post } = await getBlogPost(slug);
    return {
      title: post.seoTitle ?? `${post.title} — Shaman Kathmandu`,
      description: post.seoDescription ?? post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        images: [post.heroImageUrl],
        type: "article",
      },
    };
  } catch {
    return {};
  }
}

const productSlugsFromTags = (tags: string[]): string[] =>
  tags
    .filter((t) => t.startsWith("product:"))
    .map((t) => t.slice("product:".length));

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  let data;
  try {
    data = await getBlogPost(slug);
  } catch {
    notFound();
  }
  const { post, related } = data;

  const productSlugs = productSlugsFromTags(post.tags);
  let featuredProducts: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  if (productSlugs.length > 0) {
    const all = await listProducts({ limit: 100 });
    const set = new Set(productSlugs);
    featuredProducts = all.products.filter((p) => set.has(p.slug));
  }

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/stories", label: "Shaman Stories" },
              { label: post.title },
            ]}
          />
        </section>

        {/* Brand banner — same as the Shaman Stories index */}
        <section className="relative w-full overflow-hidden">
          <div className="relative aspect-[21/9] md:aspect-[16/6] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/stories-banner.jpeg"
              alt="Shaman Stories"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </section>

        <article className="px-6 md:px-10 mx-auto max-w-[1100px]">
          <header className="py-12">
            <h1 className="display-heading font-display text-4xl md:text-6xl text-[var(--color-cream)] leading-tight mb-6">
              {post.title}
            </h1>
            <PostMeta post={post} />
          </header>
          {post.heroVideoEmbedUrl && (
            <div className="relative aspect-video mb-12 border border-[var(--color-border)] overflow-hidden bg-black">
              <iframe
                src={post.heroVideoEmbedUrl}
                title={post.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
          <Markdown source={post.bodyMarkdown} />

          {featuredProducts.length > 0 && (
            <section className="mt-20 border-t border-[var(--color-border)] pt-12">
              <p className="label-eyebrow mb-3">Featured in this story</p>
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-8">
                Objects from <em className="text-[var(--color-gold)] not-italic">{post.title}</em>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {featuredProducts.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-20 border-t border-[var(--color-border)] pt-12">
              <p className="label-eyebrow mb-3">More stories</p>
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-8">
                Other <em className="text-[var(--color-gold)] not-italic">{post.category.name}</em> pieces
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {related.slice(0, 3).map((p) => (
                  <StoryCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-16 text-center pb-20">
            <Link
              href="/stories"
              className="label-nav text-xs text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
            >
              ← Back to all stories
            </Link>
          </div>
        </article>
      </SiteShell>
    </SiteProviders>
  );
}
