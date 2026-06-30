// Dynamic so the Docker build stage (which has no DATABASE_URL) doesn't
// try to prerender this page. At request time, hits Postgres for fresh URLs.
export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE =
  process.env.NEXT_PUBLIC_PROJECTX_ORIGIN ?? "https://shamankathmandu.com";

const trim = (s: string) => s.replace(/\/+$/, "");
const ORIGIN = trim(BASE);

// The Nepali twin of an English absolute URL (insert /ne after the origin).
function toNe(url: string): string {
  const path = url.slice(ORIGIN.length);
  return path === "" || path === "/" ? `${ORIGIN}/ne` : `${ORIGIN}/ne${path}`;
}

// Emit every URL in both locales, each cross-linked via hreflang alternates.
function withLocales(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return entries.flatMap((e) => {
    const ne = toNe(e.url);
    const languages = { en: e.url, ne };
    return [
      { ...e, alternates: { languages } },
      { ...e, url: ne, alternates: { languages } },
    ];
  });
}

const STATIC_URLS: MetadataRoute.Sitemap = [
  { url: trim(BASE) + "/", changeFrequency: "weekly", priority: 1 },
  { url: trim(BASE) + "/nature", changeFrequency: "weekly" },
  { url: trim(BASE) + "/energy", changeFrequency: "weekly" },
  { url: trim(BASE) + "/stories", changeFrequency: "weekly" },
  { url: trim(BASE) + "/bundles", changeFrequency: "monthly" },
  { url: trim(BASE) + "/contact", changeFrequency: "monthly" },
  { url: trim(BASE) + "/search", changeFrequency: "monthly" },
];

const ELEMENT_SLUGS = ["metal", "earth", "wood", "plant", "water", "air"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // If Prisma can't reach the DB (e.g. during a Docker image build with no
  // DATABASE_URL), fall back to the static URL list so the build still
  // succeeds. At runtime with a real DB, this branch is never taken.
  try {
    const [products, posts, bundles, collections, pages] = await Promise.all([
      prisma.product.findMany({
        where: { status: "published", noindex: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: { status: "published", noindex: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.bundle.findMany({
        where: { noindex: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.collection.findMany({
        where: { noindex: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.page.findMany({
        where: { noindex: false },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const out = [...STATIC_URLS];
    for (const slug of ELEMENT_SLUGS) {
      out.push({
        url: `${trim(BASE)}/nature/${slug}`,
        changeFrequency: "weekly",
      });
    }
    const services = await prisma.service
      .findMany({ select: { slug: true, updatedAt: true } })
      .catch(() => []);
    for (const s of services) {
      out.push({
        url: `${trim(BASE)}/energy/${s.slug}`,
        lastModified: s.updatedAt,
      });
    }
    for (const p of products) {
      out.push({
        url: `${trim(BASE)}/products/${p.slug}`,
        lastModified: p.updatedAt,
      });
    }
    for (const p of posts) {
      out.push({
        url: `${trim(BASE)}/stories/${p.slug}`,
        lastModified: p.updatedAt,
      });
    }
    for (const b of bundles) {
      out.push({
        url: `${trim(BASE)}/bundles/${b.slug}`,
        lastModified: b.updatedAt,
      });
    }
    for (const c of collections) {
      out.push({
        url: `${trim(BASE)}/collections/${c.slug}`,
        lastModified: c.updatedAt,
      });
    }
    for (const p of pages) {
      out.push({
        url: `${trim(BASE)}/pages/${p.slug}`,
        lastModified: p.updatedAt,
      });
    }
    return withLocales(out);
  } catch {
    return withLocales(STATIC_URLS);
  }
}
