import { getProductReviews } from "@/lib/api";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { formatDate } from "@/lib/format";

interface Props {
  productSlug: string;
}

export async function ProductReviews({ productSlug }: Props) {
  const data = await getProductReviews(productSlug, { limit: 5 }).catch(
    () => null,
  );
  if (!data || data.reviews.length === 0) return null;

  return (
    <section className="mt-20 border-t border-[var(--color-border)] pt-16">
      <SectionHeading
        eyebrow={`${data.total} ${data.total === 1 ? "review" : "reviews"}`}
        title={
          <>
            From the <em>showroom floor</em>
          </>
        }
        align="left"
        className="mb-10"
      />
      <div className="space-y-6 max-w-3xl">
        {data.reviews.map((r) => (
          <article
            key={r.id}
            className="border-b border-[var(--color-border-soft)] pb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--color-gold)]" aria-label={`${r.rating} stars`}>
                {"★".repeat(r.rating)}
                <span className="text-[var(--color-border)]">
                  {"★".repeat(5 - r.rating)}
                </span>
              </span>
              <span className="text-xs text-[var(--color-gold-muted)]">
                {formatDate(r.createdAt)}
              </span>
            </div>
            <h4 className="font-display text-lg text-[var(--color-cream)] mb-2">
              {r.title}
            </h4>
            <p className="text-sm text-[var(--color-gold-muted)] leading-relaxed mb-2">
              {r.body}
            </p>
            <span className="label-nav text-[10px] text-[var(--color-gold-muted)]">
              — {r.authorName}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
