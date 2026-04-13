import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { SiteShell } from "../layout/site-shell";
import { ShopClient } from "./shop-client";

export function ShopPage() {
  return (
    <SiteShell>
      <ShopClient products={products} categories={categories} />
    </SiteShell>
  );
}
