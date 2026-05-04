// Server-side Element resolver. The admin edits Element rows via
// /sysuser/elements; this helper overlays those edits onto the canonical
// six slugs so the storefront always reflects what the curator set —
// while remaining resilient to a DB outage (falls back to the bundled
// metadata).

import { prisma } from "@/lib/db";
import { ELEMENTS, ELEMENT_BY_SLUG } from "@/data/mock/elements";
import type { ElementMeta, ElementSlug } from "@/lib/api/types";

export async function listElementsLive(): Promise<ElementMeta[]> {
  try {
    const rows = await prisma.element.findMany({
      orderBy: [{ position: "asc" }, { slug: "asc" }],
    });
    if (rows.length === 0) return ELEMENTS;
    // Preserve canonical slug order: any DB row that matches a canonical
    // slug overrides the bundled metadata, but unknown slugs are dropped
    // (the storefront only knows how to render the six).
    return ELEMENTS.map((canonical) => {
      const row = rows.find((r) => r.slug === canonical.slug);
      if (!row) return canonical;
      return {
        slug: canonical.slug,
        name: row.name,
        icon: row.icon,
        accent: row.accent,
        natureSource: row.natureSource,
        energyDescription: row.energyDescription,
      };
    });
  } catch {
    return ELEMENTS;
  }
}

export async function getElementLive(
  slug: string,
): Promise<ElementMeta | undefined> {
  try {
    const row = await prisma.element.findUnique({ where: { slug } });
    if (row) {
      return {
        slug: row.slug as ElementSlug,
        name: row.name,
        icon: row.icon,
        accent: row.accent,
        natureSource: row.natureSource,
        energyDescription: row.energyDescription,
      };
    }
  } catch {
    // fall through
  }
  return ELEMENT_BY_SLUG[slug as ElementSlug];
}
