import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getCounts() {
  const [products, posts, bundles, collections, pages, services, showrooms, media] =
    await Promise.all([
      prisma.product.count(),
      prisma.blogPost.count(),
      prisma.bundle.count(),
      prisma.collection.count(),
      prisma.page.count(),
      prisma.service.count(),
      prisma.showroom.count(),
      prisma.media.count(),
    ]);
  return {
    products,
    posts,
    bundles,
    collections,
    pages,
    services,
    showrooms,
    media,
  };
}

export default async function DashboardPage() {
  const counts = await getCounts();
  const cards = [
    { href: "/sysuser/blog", label: "Blog posts", n: counts.posts },
    { href: "/sysuser/products", label: "Products", n: counts.products },
    { href: "/sysuser/bundles", label: "Bundles", n: counts.bundles },
    { href: "/sysuser/collections", label: "Collections", n: counts.collections },
    { href: "/sysuser/pages", label: "Pages", n: counts.pages },
    { href: "/sysuser/services", label: "Services", n: counts.services },
    { href: "/sysuser/showrooms", label: "Showrooms", n: counts.showrooms },
    { href: "/sysuser/media", label: "Media", n: counts.media },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-gold)]"
          >
            <div className="text-xs uppercase tracking-wider opacity-60">
              {c.label}
            </div>
            <div className="mt-2 font-display text-3xl">{c.n}</div>
          </Link>
        ))}
      </div>
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm opacity-80">
        <p>
          <strong>Quick start:</strong> use <Link className="text-[var(--color-gold)] underline" href="/sysuser/homepage">Homepage</Link> to
          curate what shows on the front page (hero, featured story, new releases,
          element spotlights). Use <Link className="text-[var(--color-gold)] underline" href="/sysuser/products">Products</Link> to
          tick which ones are featured or new releases.
        </p>
      </div>
    </div>
  );
}
