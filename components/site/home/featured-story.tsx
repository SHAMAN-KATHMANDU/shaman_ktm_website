import Link from "next/link";
import { listFeaturedPosts } from "@/lib/api";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";
import { PlayIcon } from "@/components/site/icons";

export async function FeaturedStory() {
  const { posts } = await listFeaturedPosts({ limit: 1 });
  const post = posts[0];
  if (!post) return null;
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="Shaman Stories"
          title={
            <>
              The latest <em>story</em>
            </>
          }
          subtitle="Films, conversations, and small documentaries from the makers and places behind the objects we sell."
          className="mb-12"
        />
        <Link
          href={`/stories/${post.slug}`}
          className="group block relative aspect-[21/9] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.heroImageUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="w-20 h-20 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center text-[var(--color-gold)] bg-black/40 group-hover:bg-[var(--color-gold)] group-hover:text-[var(--color-base)] transition-colors">
              <PlayIcon size={28} />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-black/80 to-transparent">
            <p className="label-eyebrow text-[var(--color-gold)] mb-2">
              {post.category.name}
            </p>
            <h3 className="font-display text-3xl md:text-5xl text-[var(--color-cream)] leading-tight max-w-2xl">
              {post.title}
            </h3>
          </div>
        </Link>
        <div className="mt-8 text-center">
          <Button href="/stories" variant="outline">
            View All Stories
          </Button>
        </div>
      </div>
    </section>
  );
}
