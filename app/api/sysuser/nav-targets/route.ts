export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";

export interface NavTarget {
  label: string;
  href: string;
  hint?: string;
}

const SECTIONS: NavTarget[] = [
  { label: "Home", href: "/" },
  { label: "Nature (all elements)", href: "/nature" },
  { label: "Energy (all services)", href: "/energy" },
  { label: "Shaman Stories", href: "/stories" },
  { label: "Bundles", href: "/bundles" },
  { label: "Search", href: "/search" },
  { label: "Contact", href: "/contact" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Account login", href: "/account/login" },
];

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const [
    pages,
    products,
    categories,
    collections,
    services,
    stories,
    elements,
    bundles,
  ] = await Promise.all([
    prisma.page.findMany({
      select: { slug: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.product.findMany({
      select: { slug: true, name: true },
      where: { status: "published" },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { slug: true, name: true },
      orderBy: { position: "asc" },
    }),
    prisma.collection.findMany({
      select: { slug: true, title: true },
      orderBy: { position: "asc" },
    }),
    prisma.service.findMany({
      select: { slug: true, name: true },
      orderBy: { position: "asc" },
    }),
    prisma.blogPost.findMany({
      select: { slug: true, title: true },
      where: { status: "published" },
      orderBy: { title: "asc" },
    }),
    prisma.element.findMany({
      select: { slug: true, name: true },
      orderBy: { position: "asc" },
    }),
    prisma.bundle.findMany({
      select: { slug: true, title: true },
      orderBy: { position: "asc" },
    }),
  ]);

  return NextResponse.json({
    message: "ok",
    targets: {
      sections: SECTIONS,
      pages: pages.map((p) => ({
        label: p.title,
        href: `/pages/${p.slug}`,
        hint: p.slug,
      })),
      products: products.map((p) => ({
        label: p.name,
        href: `/products/${p.slug}`,
        hint: p.slug,
      })),
      categories: categories.map((c) => ({
        label: c.name,
        href: `/categories/${c.slug}`,
        hint: c.slug,
      })),
      collections: collections.map((c) => ({
        label: c.title,
        href: `/collections/${c.slug}`,
        hint: c.slug,
      })),
      services: services.map((s) => ({
        label: s.name,
        href: `/energy/${s.slug}`,
        hint: s.slug,
      })),
      stories: stories.map((s) => ({
        label: s.title,
        href: `/stories/${s.slug}`,
        hint: s.slug,
      })),
      elements: elements.map((e) => ({
        label: e.name,
        href: `/nature/${e.slug}`,
        hint: e.slug,
      })),
      bundles: bundles.map((b) => ({
        label: b.title,
        href: `/bundles/${b.slug}`,
        hint: b.slug,
      })),
    } satisfies Record<string, NavTarget[]>,
  });
}
