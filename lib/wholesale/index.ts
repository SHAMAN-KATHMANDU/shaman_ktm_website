// The public wholesale catalog.
//
// Deliberately its own narrow query rather than a flag on the shared product
// API: the one thing this page must never do is emit `wholesalePrice` or
// `costPrice`, and an explicit select is a guarantee rather than a promise —
// a field that isn't named cannot be serialised by accident later.
//
// What IS public: the MOQ. A trade buyer needs to know the minimum before
// they bother enquiring; the price is what the enquiry is for (Roshan's
// decision — MOQ shown, price hidden, Enquire the only CTA).

import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/i18n/locale";
import type { ElementSlug } from "@/lib/api/types";

export interface WholesaleProduct {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
  moq: number | null;
  elementSlugs: ElementSlug[];
  categoryName: string | null;
}

/**
 * Published products flagged into the wholesale catalog.
 *
 * `wholesaleEnabled` is a curation flag, not a pricing one: the subset a trade
 * buyer should see, which is smaller than the retail catalog and does not track
 * whether a wholesale price has been set yet.
 */
export async function listWholesaleProducts(
  locale: Locale = "en",
): Promise<WholesaleProduct[]> {
  const rows = await prisma.product.findMany({
    where: { wholesaleEnabled: true, status: "published" },
    select: {
      id: true,
      slug: true,
      name: true,
      nameNe: true,
      thumbnailUrl: true,
      moq: true,
      elementSlugs: true,
      category: { select: { name: true, nameNe: true } },
      // wholesalePrice and costPrice are absent on purpose — see the file note.
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    // Same ne || en fallback the rest of the storefront uses.
    name: (locale === "ne" && p.nameNe) || p.name,
    thumbnailUrl: p.thumbnailUrl,
    moq: p.moq,
    // Stored as free strings; the badge only renders ones it knows.
    elementSlugs: p.elementSlugs as ElementSlug[],
    categoryName: p.category
      ? (locale === "ne" && p.category.nameNe) || p.category.name
      : null,
  }));
}
