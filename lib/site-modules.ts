// Server-only accessor for the per-site module flags stored inside
// SiteConfig.data.modules. Public components import getSiteModules() to gate
// rendering. Defaults are "all on" so a fresh install behaves like the static
// site shipped with.

import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export interface SiteModules {
  homeHero: boolean;
  homeBrandStrip: boolean;
  homeElementsGrid: boolean;
  homeNewReleases: boolean;
  homeFeaturedStory: boolean;
  homeServicesPreview: boolean;
  blogIndex: boolean;
  bundlesIndex: boolean;
  collectionsIndex: boolean;
  servicesIndex: boolean;
  showroomsList: boolean;
  whatsappFloat: boolean;
  search: boolean;
  reviews: boolean;
  cart: boolean;
  announcementBar: boolean;
  comingSoonOverlay: boolean;
}

export const DEFAULT_MODULES: SiteModules = {
  homeHero: true,
  homeBrandStrip: true,
  homeElementsGrid: true,
  homeNewReleases: true,
  homeFeaturedStory: true,
  homeServicesPreview: true,
  blogIndex: true,
  bundlesIndex: true,
  collectionsIndex: true,
  servicesIndex: true,
  showroomsList: true,
  whatsappFloat: true,
  search: true,
  reviews: true,
  cart: true,
  announcementBar: false,
  comingSoonOverlay: false,
};

export const getSiteModules = unstable_cache(
  async (): Promise<SiteModules> => {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const stored =
      row?.data && typeof row.data === "object" && "modules" in row.data
        ? ((row.data as { modules?: Partial<SiteModules> }).modules ?? {})
        : {};
    return { ...DEFAULT_MODULES, ...stored };
  },
  ["site-modules"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);

export async function getModule(
  key: keyof SiteModules,
): Promise<boolean> {
  const m = await getSiteModules();
  return m[key];
}
