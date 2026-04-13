import Link from "next/link";
import { getFeaturedProducts } from "@/data/products";
import { ProductCard } from "../product-card";
import { Reveal } from "../reveal";
import { T } from "../i18n/t";

export function Bestsellers() {
  const items = getFeaturedProducts().slice(0, 4);
  return (
    <section className="sk-section sk-white">
      <div className="sk-wrap">
        <Reveal>
          <div className="sk-sec-top">
            <div className="sk-sec-tl">
              <p className="sk-eyebrow">
                <T en="Most loved" np="सबैभन्दा मन पराइएका" />
              </p>
              <h2 className="sk-section-h">
                <T
                  en={<>Best<strong>sellers</strong></>}
                  np="लोकप्रिय"
                />
              </h2>
            </div>
            <Link href="/shop" className="sk-view-all">
              <T en="View All →" np="सबै →" />
            </Link>
          </div>
        </Reveal>
        <div className="sk-product-grid">
          {items.map((p, i) => (
            <Reveal key={p.slug} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
