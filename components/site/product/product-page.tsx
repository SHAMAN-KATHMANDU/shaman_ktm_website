import Link from "next/link";
import type { Product } from "@/types/product";
import { getRelatedProducts } from "@/data/products";
import { SiteShell } from "../layout/site-shell";
import { ProductCard, formatRupees } from "../product-card";
import { T } from "../i18n/t";
import { WA_LINK } from "@/lib/contact";
import { WaIcon } from "../icons";

export function ProductPage({ product }: { product: Product }) {
  const related = getRelatedProducts(product, 4);
  const waHref = `${WA_LINK}?text=${encodeURIComponent(
    `Hi! I'd like to order: ${product.name}`,
  )}`;
  return (
    <SiteShell>
      <section className="sk-section sk-white">
        <div className="sk-wrap">
          <div className="sk-pdp">
            <div className="sk-pdp-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.alt} />
              {product.badge ? (
                <div className="sk-pc-badge" style={{ top: 18, left: 18 }}>
                  {product.badge.kind === "off" ? (
                    <span className="sk-badge-off">−{product.badge.percent}%</span>
                  ) : (
                    <span className="sk-badge-new">
                      <T en="New" np="नयाँ" />
                    </span>
                  )}
                </div>
              ) : null}
            </div>
            <div className="sk-pdp-body">
              <div className="sk-pdp-crumb">
                <Link href="/shop">
                  <T en="Shop" np="पसल" />
                </Link>{" "}
                /{" "}
                <Link href={`/shop?category=${product.category}`}>
                  {product.categoryLabel}
                </Link>
              </div>
              <h1 className="sk-pdp-title">{product.name}</h1>
              <div className="sk-pdp-price">
                <span className="sk-price-now">{formatRupees(product.price)}</span>
                {product.wasPrice ? (
                  <span className="sk-price-was">
                    {formatRupees(product.wasPrice)}
                  </span>
                ) : null}
                {product.badge?.kind === "off" ? (
                  <span className="sk-price-off">
                    −{product.badge.percent}%
                  </span>
                ) : null}
              </div>
              <p className="sk-pdp-desc">{product.description}</p>
              <div className="sk-pdp-actions">
                <a
                  href={waHref}
                  className="sk-btn sk-btn-wa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WaIcon size={16} />
                  &nbsp;<T en="Order on WhatsApp" np="वाट्सएपमा अर्डर" />
                </a>
                <Link href="/shop" className="sk-btn sk-btn-outline">
                  ← <T en="Back to Shop" np="पसलमा फर्किनुहोस्" />
                </Link>
              </div>
            </div>
          </div>

          {related.length > 0 ? (
            <div style={{ marginTop: 72 }}>
              <div className="sk-sec-top">
                <div className="sk-sec-tl">
                  <p className="sk-eyebrow">
                    <T en="You may also like" np="यो पनि मन पराउनुहुन्छ" />
                  </p>
                  <h2 className="sk-section-h">
                    <T
                      en={<>More from <em>{product.categoryLabel}</em></>}
                      np="सम्बन्धित"
                    />
                  </h2>
                </div>
              </div>
              <div className="sk-product-grid">
                {related.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
