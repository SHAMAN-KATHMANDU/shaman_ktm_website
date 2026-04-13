import { ugcPhotos } from "@/data/articles";
import { Reveal } from "../reveal";
import { T } from "../i18n/t";

export function SocialProof() {
  return (
    <section className="sk-section sk-parch">
      <div className="sk-wrap">
        <div className="sk-sp-layout">
          <Reveal>
            <div className="sk-ugc-grid">
              {ugcPhotos.map((p, i) => (
                <div className="sk-ugc-cell" key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.alt} loading="lazy" />
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div>
              <p className="sk-eyebrow">
                <T
                  en="Real customers · Real love"
                  np="साँचो ग्राहक · साँचो माया"
                />
              </p>
              <h2 className="sk-section-h" style={{ margin: "8px 0 0" }}>
                <T
                  en={<>The <em>Shaman</em> Family</>}
                  np={<><em>शामान</em> परिवार</>}
                />
              </h2>
              <div className="sk-stat-boxes">
                <div className="sk-stat-box">
                  <div className="sk-s-num">
                    4.9<span>★</span>
                  </div>
                  <div className="sk-s-lbl">
                    <T en="Average Rating" np="औसत रेटिंग" />
                  </div>
                </div>
                <div className="sk-stat-box">
                  <div className="sk-s-num">
                    100<span>%</span>
                  </div>
                  <div className="sk-s-lbl">
                    <T en="Handcrafted" np="हस्तनिर्मित" />
                  </div>
                </div>
                <div className="sk-stat-box">
                  <div className="sk-s-num">Free</div>
                  <div className="sk-s-lbl">
                    <T en="WhatsApp Support" np="वाट्सएप सहयोग" />
                  </div>
                </div>
                <div className="sk-stat-box">
                  <div className="sk-s-num">🇳🇵</div>
                  <div className="sk-s-lbl">
                    <T en="Made in Nepal" np="नेपालमा बनाइएको" />
                  </div>
                </div>
              </div>
              <div className="sk-review-box">
                <div className="sk-review-stars">★★★★★</div>
                <p className="sk-review-text">
                  &ldquo;Every piece from Shaman Kathmandu carries a story. The
                  quality is unmatched and the WhatsApp ordering made it so
                  easy.&rdquo;
                </p>
                <div className="sk-review-author">
                  <div className="sk-review-av">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://picsum.photos/seed/shamanktm-sunita/120/120"
                      alt="Sunita Thapa"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div className="sk-review-name">Sunita Thapa</div>
                    <div className="sk-review-loc">
                      Verified Customer · Lalitpur
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
