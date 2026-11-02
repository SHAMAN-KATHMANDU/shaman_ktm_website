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
    <section className="mt-20 border-t border-line pt-16">
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
            className="border-b border-line pb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-metal-text" aria-label={`${r.rating} stars`}>
                {"★".repeat(r.rating)}
                <span className="text-ink-soft">
                  {"★".repeat(5 - r.rating)}
                </span>
              </span>
              <span className="text-xs text-ink-soft">
                {formatDate(r.createdAt)}
              </span>
            </div>
            <h4 className="font-display text-lg text-ink mb-2">
              {r.title}
            </h4>
            <p className="text-sm text-ink-soft leading-relaxed mb-2">
              {r.body}
            </p>
            <span className="label-nav text-[10px] text-ink-soft">
              — {r.authorName}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
