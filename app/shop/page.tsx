import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { ShopPage } from "@/components/site/shop/shop-page";

export const metadata: Metadata = {
  title: "Shop — Shaman Kathmandu",
  description:
    "Browse handcrafted jewelry, spiritual items, statues, home decor, furniture, and gifts from Shaman Kathmandu.",
};

export default function Page() {
  if (IS_COMING_SOON) notFound();
  return <ShopPage />;
}
