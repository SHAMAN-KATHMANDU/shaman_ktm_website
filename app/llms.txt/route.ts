// Dynamic so the Docker build stage (which has no DATABASE_URL) doesn't try
// to prerender it — same reason as app/sitemap.ts.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import { getSiteContact } from "@/lib/site-content";
import { buildLlmsTxt } from "@/lib/llms-txt";

const HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
};

export async function GET() {
  try {
    const [config, contact, showrooms, categories, services, pages, posts] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 }, select: { data: true } }),
      getSiteContact(),
      prisma.showroom.findMany({
        where: { active: true, type: "showroom" },
        select: { name: true, address: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
      prisma.category.findMany({
        where: { products: { some: { status: "published" } } },
        select: { slug: true, name: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
      prisma.service.findMany({
        where: { noindex: false },
        select: { slug: true, name: true, duration: true, pricePerSession: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
      // "faq" is served from the Faq table; "faq-legacy" is a dead backup row.
      prisma.page.findMany({
        where: { noindex: false, slug: { notIn: ["faq", "faq-legacy"] } },
        select: { slug: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.blogPost.findMany({
        where: { status: "published", noindex: false },
        select: { slug: true, title: true },
        orderBy: { publishedAt: "desc" },
        take: 20,
      }),
    ]);
    const tagline = (config?.data as { tagline?: unknown } | null)?.tagline;
    const body = buildLlmsTxt({
      origin: siteUrl,
      tagline: typeof tagline === "string" ? tagline : undefined,
      contact,
      showrooms,
      categories,
      services,
      pages,
      posts,
    });
    return new Response(body, { headers: HEADERS });
  } catch (err) {
    console.error("[llms.txt] failed to build", err);
    // Links only — no copy to get wrong while the DB is unreachable.
    return new Response(
      `# Shaman Kathmandu\n\n- [Products](${siteUrl}/products)\n- [FAQ](${siteUrl}/pages/faq)\n- [Contact](${siteUrl}/contact)\n`,
      { headers: { ...HEADERS, "Cache-Control": "no-store" } },
    );
  }
}
