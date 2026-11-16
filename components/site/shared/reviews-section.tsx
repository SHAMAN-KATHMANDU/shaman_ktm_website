import { getProductReviews } from "@/lib/api";
import { getServiceReviews } from "@/lib/api/server/products";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ReviewForm } from "@/components/site/shared/review-form";
import { getSiteModules } from "@/lib/site-modules";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { formatDate } from "@/lib/format";

type Props =
  | { productId: string; productSlug: string }
  | { serviceSlug: string };

/** Approved reviews plus the review form, for a product or a service page. */
export async function ReviewsSection(props: Props) {
  if (!(await getSiteModules()).reviews) return null;
  const t = getDictionary(await getLocale()).reviews;
  const data =
    "serviceSlug" in props
      ? await getServiceReviews(props.serviceSlug, { limit: 5 }).catch(() => null)
      : await getProductReviews(props.productSlug, { limit: 5 }).catch(() => null);
  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;

  return (
    <section className="mt-20 border-t border-line pt-16">
      <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
        <div>
          <SectionHeading
            eyebrow={
              total === 0
                ? undefined
                : total === 1
                  ? t.countOne
                  : t.countMany.replace("{n}", String(total))
            }
            title={"serviceSlug" in props ? t.serviceHeading : t.productHeading}
            align="left"
            className="mb-10"
          />
          <div className="space-y-6 max-w-3xl">
            {reviews.map((r) => (
              <article key={r.id} className="border-b border-line pb-6">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-metal-text"
                    role="img"
                    aria-label={t.stars.replace("{n}", String(r.rating))}
                  >
                    {"★".repeat(r.rating)}
                    <span className="text-ink-soft">
                      {"★".repeat(5 - r.rating)}
                    </span>
                  </span>
                  <span className="text-xs text-ink-soft">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <h4 className="font-display text-lg text-ink mb-2">{r.title}</h4>
                <p className="text-sm text-ink-soft leading-relaxed mb-2 whitespace-pre-line">
                  {r.body}
                </p>
                <span className="label-nav text-[10px] text-ink-soft">
                  — {r.authorName}
                </span>
              </article>
            ))}
          </div>
        </div>
        <ReviewForm
          {...("serviceSlug" in props
            ? { serviceSlug: props.serviceSlug }
            : { productId: props.productId })}
        />
      </div>
    </section>
  );
}
