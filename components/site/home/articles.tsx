import { articles } from "@/data/articles";
import { Reveal } from "../reveal";
import { T } from "../i18n/t";

export function Articles() {
  return (
    <section className="sk-section sk-parch" id="howto">
      <div className="sk-wrap">
        <Reveal>
          <div className="sk-sec-top">
            <div className="sk-sec-tl">
              <p className="sk-eyebrow">
                <T en="Learn & Explore" np="सिक्नुहोस्" />
              </p>
              <h2 className="sk-section-h">
                <T
                  en={<>Learn the Story Behind <em>Every Piece</em></>}
                  np={<>प्रत्येक कथा <em>पछाडि</em></>}
                />
              </h2>
            </div>
            <a href="#howto" className="sk-view-all">
              <T en="All Guides →" np="सबै गाइड →" />
            </a>
          </div>
        </Reveal>
        <div className="sk-article-grid">
          {articles.map((a, i) => (
            <Reveal key={a.slug} delay={((i % 3) + 1) as 1 | 2 | 3}>
              <article className="sk-article-card">
                <div className="sk-article-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt={a.alt} loading="lazy" />
                </div>
                <div className="sk-article-body">
                  <span className="sk-tag sk-tag-g">{a.tag}</span>
                  <h3 className="sk-article-title">{a.title}</h3>
                  <p className="sk-article-excerpt">{a.excerpt}</p>
                  <a href="#" className="sk-read-link">
                    <T en="Read Guide →" np="पढ्नुहोस् →" />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
