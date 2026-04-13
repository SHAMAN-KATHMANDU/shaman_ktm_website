import Link from "next/link";
import { categories } from "@/data/categories";
import { Reveal } from "../reveal";
import { T } from "../i18n/t";

export function CategoryGrid() {
  return (
    <section className="sk-section sk-parch" id="shop">
      <div className="sk-wrap">
        <Reveal>
          <div className="sk-sec-top">
            <div className="sk-sec-tl">
              <p className="sk-eyebrow">
                <T en="Browse by category" np="श्रेणी अनुसार" />
              </p>
              <h2 className="sk-section-h">
                <T
                  en={<>Shop by <em>Vibe</em></>}
                  np={<>श्रेणी <em>अनुसार</em></>}
                />
              </h2>
            </div>
            <Link href="/shop" className="sk-view-all">
              <T en="All Categories →" np="सबै →" />
            </Link>
          </div>
        </Reveal>
        <div className="sk-cat-grid">
          {categories.map((cat, i) => (
            <Reveal key={cat.slug} delay={((i % 3) + 1) as 1 | 2 | 3}>
              <Link
                href={`/shop?category=${cat.slug}`}
                className="sk-cat-tile"
                style={{ display: "block", height: "100%" }}
              >
                <div className="sk-cat-tile-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.image} alt={cat.alt} loading="lazy" />
                </div>
                <div className="sk-cat-tile-fade" />
                <div className="sk-cat-tile-body">
                  <span className="sk-cat-name">
                    <T en={cat.name.en} np={cat.name.np} />
                  </span>
                  <span className="sk-cat-np sk-t-en">{cat.name.np}</span>
                  <span className="sk-cat-cta">
                    <T en="Explore →" np="हेर्नुहोस् →" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
