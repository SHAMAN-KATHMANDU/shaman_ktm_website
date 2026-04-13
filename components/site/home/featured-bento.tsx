import Link from "next/link";
import { getFeaturedProducts } from "@/data/products";
import { ProductCard } from "../product-card";
import { Reveal } from "../reveal";
import { T } from "../i18n/t";
import { WA_LINK } from "@/lib/contact";
import { formatRupees } from "../product-card";

export function FeaturedBento() {
  const all = getFeaturedProducts();
  const hero = all.find((p) => p.slug === "crystal-singing-bowl-8in") ?? all[0];
  const rest = all.filter((p) => p.slug !== hero.slug).slice(0, 3);

  const waHref = `${WA_LINK}?text=${encodeURIComponent(
    `Hi! I'd like: ${hero.name}`,
  )}`;

  return (
    <section className="sk-section sk-white">
      <div className="sk-wrap">
        <Reveal>
          <div className="sk-sec-top">
            <div className="sk-sec-tl">
              <p className="sk-eyebrow">
                <T en="Handpicked for you" np="तपाईंको लागि छानिएको" />
              </p>
              <h2 className="sk-section-h">
                <T
                  en={<>Featured <strong>Collection</strong></>}
                  np="विशेष संग्रह"
                />
              </h2>
            </div>
            <Link href="/shop" className="sk-view-all">
              <T en="View All →" np="सबै →" />
            </Link>
          </div>
        </Reveal>
        <div className="sk-bento-grid">
          <Reveal delay={1}>
            <div className="sk-bento-hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.image} alt={hero.alt} loading="lazy" />
              <div className="sk-bento-fade" />
              <div className="sk-bento-body">
                <span className="sk-tag sk-tag-w">Premium · Spiritual</span>
                <div className="sk-bento-name">{hero.name}</div>
                <div className="sk-bento-price">{formatRupees(hero.price)}</div>
                <div className="sk-bento-actions">
                  <Link
                    href={`/product/${hero.slug}`}
                    className="sk-btn sk-btn-green sk-btn-sm"
                  >
                    <T en="View Details" np="विवरण" />
                  </Link>
                  <a
                    href={waHref}
                    className="sk-btn sk-btn-wa sk-btn-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
          {rest.map((p, i) => (
            <Reveal key={p.slug} delay={((i % 3) + 1) as 1 | 2 | 3}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
