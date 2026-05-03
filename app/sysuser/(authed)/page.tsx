import Link from "next/link";
import {
  Boxes,
  ImageIcon,
  ListTree,
  MapPin,
  Newspaper,
  Package,
  ShoppingBag,
  Wrench,
  ToggleRight,
  Sparkles,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getCounts() {
  const [
    products,
    publishedProducts,
    featuredProducts,
    posts,
    publishedPosts,
    bundles,
    collections,
    pages,
    services,
    showrooms,
    media,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "published" } }),
    prisma.product.count({ where: { isFeatured: true } }),
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: "published" } }),
    prisma.bundle.count(),
    prisma.collection.count(),
    prisma.page.count(),
    prisma.service.count(),
    prisma.showroom.count(),
    prisma.media.count(),
  ]);
  return {
    products,
    publishedProducts,
    featuredProducts,
    posts,
    publishedPosts,
    bundles,
    collections,
    pages,
    services,
    showrooms,
    media,
  };
}

const TILES = [
  { href: "/sysuser/products", label: "Products", icon: Package, key: "products" as const },
  { href: "/sysuser/blog", label: "Blog posts", icon: Newspaper, key: "posts" as const },
  { href: "/sysuser/bundles", label: "Bundles", icon: ShoppingBag, key: "bundles" as const },
  { href: "/sysuser/collections", label: "Collections", icon: Boxes, key: "collections" as const },
  { href: "/sysuser/pages", label: "Pages", icon: ListTree, key: "pages" as const },
  { href: "/sysuser/services", label: "Services", icon: Wrench, key: "services" as const },
  { href: "/sysuser/showrooms", label: "Showrooms", icon: MapPin, key: "showrooms" as const },
  { href: "/sysuser/media", label: "Media", icon: ImageIcon, key: "media" as const },
];

export default async function DashboardPage() {
  const counts = await getCounts();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="At-a-glance content health for the Shaman site."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-gold)]"
            >
              <div className="flex items-start justify-between">
                <div className="text-[10px] uppercase tracking-wider opacity-50">
                  {t.label}
                </div>
                <Icon size={14} className="opacity-30 group-hover:opacity-100 group-hover:text-[var(--color-gold)]" />
              </div>
              <div className="mt-3 font-display text-3xl text-[var(--color-cream)]">
                {counts[t.key]}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Catalog health">
          <div className="space-y-2">
            <Row
              label="Products published"
              value={`${counts.publishedProducts} / ${counts.products}`}
              tone="success"
            />
            <Row
              label="Featured on homepage"
              value={`${counts.featuredProducts} marked`}
              icon={<Star size={12} />}
              tone="gold"
            />
            <Row
              label="Stories published"
              value={`${counts.publishedPosts} / ${counts.posts}`}
              tone="success"
            />
          </div>
        </Card>

        <Card title="Quick start">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <ToggleRight size={14} className="text-[var(--color-gold)]" />
              <Link
                className="text-[var(--color-gold)] hover:underline"
                href="/sysuser/modules"
              >
                Open Modules
              </Link>
              <span className="opacity-60">— turn site sections on/off.</span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--color-gold)]" />
              <Link
                className="text-[var(--color-gold)] hover:underline"
                href="/sysuser/homepage"
              >
                Curate homepage
              </Link>
              <span className="opacity-60">— hero, featured story, releases.</span>
            </li>
            <li className="flex items-center gap-2">
              <Star size={14} className="text-[var(--color-gold)]" />
              <Link
                className="text-[var(--color-gold)] hover:underline"
                href="/sysuser/products"
              >
                Tick featured products
              </Link>
              <span className="opacity-60">— bulk-toggle from the list.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "gold" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm">
      <span className="opacity-70">{label}</span>
      <Badge tone={tone} icon={icon}>
        {value}
      </Badge>
    </div>
  );
}
