"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import type { Category, Product } from "@/types/product";
import { ProductCard } from "../product-card";
import { T } from "../i18n/t";

function ShopInner({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const params = useSearchParams();
  const active = params.get("category");

  const filtered = useMemo(() => {
    if (!active) return products;
    return products.filter((p) => p.category === active);
  }, [products, active]);

  return (
    <section className="sk-section sk-parch">
      <div className="sk-wrap">
        <div className="sk-sec-top">
          <div className="sk-sec-tl">
            <p className="sk-eyebrow">
              <T en="All products" np="सबै उत्पादन" />
            </p>
            <h2 className="sk-section-h">
              <T
                en={<>Shop <em>Everything</em></>}
                np={<>सबै <em>उत्पादन</em></>}
              />
            </h2>
          </div>
          <span className="sk-view-all" aria-hidden>
            {filtered.length}{" "}
            <T en="products" np="उत्पादन" />
          </span>
        </div>

        <div className="sk-shop-filters" role="tablist" aria-label="Category filters">
          <Link
            href="/shop"
            className={`sk-filter-chip${!active ? " sk-active" : ""}`}
            role="tab"
            aria-selected={!active}
          >
            <T en="All" np="सबै" />
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className={`sk-filter-chip${active === cat.slug ? " sk-active" : ""}`}
              role="tab"
              aria-selected={active === cat.slug}
            >
              <T en={cat.name.en} np={cat.name.np} />
            </Link>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="sk-product-grid">
            {filtered.map((p) => (
              <ProductCard product={p} key={p.slug} />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", padding: "40px 0", color: "var(--sk-stone)" }}>
            <T
              en="No products in this category yet."
              np="यस श्रेणीमा हाल कुनै उत्पादन छैन।"
            />
          </p>
        )}
      </div>
    </section>
  );
}

export function ShopClient(props: { products: Product[]; categories: Category[] }) {
  return (
    <Suspense fallback={null}>
      <ShopInner {...props} />
    </Suspense>
  );
}
