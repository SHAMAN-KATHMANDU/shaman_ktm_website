import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE =
  process.env.NEXT_PUBLIC_PROJECTX_ORIGIN ?? "https://shamankathmandu.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const trim = (s: string) => s.replace(/\/+$/, "");
  const out: MetadataRoute.Sitemap = [
    { url: trim(BASE) + "/", changeFrequency: "weekly", priority: 1 },
    { url: trim(BASE) + "/stories", changeFrequency: "weekly" },
    { url: trim(BASE) + "/bundles", changeFrequency: "monthly" },
    { url: trim(BASE) + "/search", changeFrequency: "monthly" },
  ];

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
  return out;
}
