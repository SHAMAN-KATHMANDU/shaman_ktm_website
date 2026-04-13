import Link from "next/link";
import type { Product } from "@/types/product";
import { WA_LINK } from "@/lib/contact";
import { WaIcon } from "./icons";
import { T } from "./i18n/t";

function formatRupees(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

export function ProductCard({ product }: { product: Product }) {
  const waHref = `${WA_LINK}?text=${encodeURIComponent(
    `Hi! I'd like: ${product.name}`,
  )}`;
  return (
    <article className="sk-product-card">
      <Link
        href={`/product/${product.slug}`}
        className="sk-pc-img"
        aria-label={product.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.alt} loading="lazy" />
        {product.badge ? (
          <div className="sk-pc-badge">
            {product.badge.kind === "off" ? (
              <span className="sk-badge-off">−{product.badge.percent}%</span>
            ) : (
              <span className="sk-badge-new">
                <T en="New" np="नयाँ" />
              </span>
            )}
          </div>
        ) : null}
        <div className="sk-pc-quick">
          <T en="+ View Details" np="+ विवरण हेर्नुहोस्" />
        </div>
      </Link>
      <div className="sk-pc-body">
        <div className="sk-pc-tag">
          <span className="sk-tag sk-tag-g">{product.categoryLabel}</span>
        </div>
        <Link
          href={`/product/${product.slug}`}
          className="sk-pc-name"
          style={{ color: "inherit" }}
        >
          {product.name}
        </Link>
        <div className="sk-pc-price">
          <span className="sk-price-now">{formatRupees(product.price)}</span>
          {product.wasPrice ? (
            <span className="sk-price-was">{formatRupees(product.wasPrice)}</span>
          ) : null}
        </div>
        <div className="sk-pc-actions">
          <Link href={`/product/${product.slug}`} className="sk-add-btn">
            <T en="View" np="हेर्नुहोस्" />
          </Link>
          <a
            href={waHref}
            className="sk-wa-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Order via WhatsApp"
          >
            <WaIcon />
          </a>
        </div>
      </div>
    </article>
  );
}

export { formatRupees };
