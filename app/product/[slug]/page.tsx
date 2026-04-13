import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { getProductBySlug, products } from "@/data/products";
import { ProductPage } from "@/components/site/product/product-page";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  if (IS_COMING_SOON) return [{ slug: "_placeholder" }];
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Shaman Kathmandu" };
  return {
    title: `${product.name} — Shaman Kathmandu`,
    description: product.description,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  if (IS_COMING_SOON) notFound();
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return <ProductPage product={product} />;
}
