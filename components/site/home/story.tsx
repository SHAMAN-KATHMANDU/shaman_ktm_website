import { Reveal } from "../reveal";
import { T } from "../i18n/t";

export function Story() {
  return (
    <section className="sk-section sk-parch" id="story">
      <div className="sk-wrap">
        <Reveal>
          <div className="sk-story-grid">
            <div className="sk-story-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://picsum.photos/seed/shamanktm-story/900/1200"
                alt="Nepal artisan at work"
                loading="lazy"
              />
              <div className="sk-story-tint" />
              <div className="sk-story-badge">
                <div className="sk-story-badge-n">2004</div>
                <div className="sk-story-badge-l">
                  <T en="Founded in Kathmandu" np="काठमाडौंमा स्थापना" />
                </div>
              </div>
            </div>
            <div className="sk-story-content">
              <p className="sk-eyebrow">
                <T en="Our Story" np="हाम्रो कथा" />
              </p>
              <h2 className="sk-story-h">
                <T
                  en={<>Born in Kathmandu.<br /><em>Crafted with soul.</em></>}
                  np={<>काठमाडौंमा जन्मियो।<br /><em>आत्माले बनाइयो।</em></>}
                />
              </h2>
              <p className="sk-story-p">
                <T
                  en="From the ancient streets of Thamel to three showrooms across the valley, Shaman Kathmandu celebrates Nepal's living craft traditions. Every piece carries the hands and hearts of the artisans who made it."
                  np="थमेलको पुरानो सडकहरूबाट उपत्यकाभर तीन शोरूमसम्म, शामान काठमाडौं नेपालको जीवित शिल्प परम्पराको उत्सव हो।"
                />
              </p>
              <div className="sk-story-stats">
                <div>
                  <div className="sk-stat-n">10K+</div>
                  <div className="sk-stat-l">
                    <T en="Happy Customers" np="खुसी ग्राहक" />
                  </div>
                </div>
                <div>
                  <div className="sk-stat-n">3</div>
                  <div className="sk-stat-l">
                    <T en="Showrooms" np="शोरूम" />
                  </div>
                </div>
                <div>
                  <div className="sk-stat-n">1,064</div>
                  <div className="sk-stat-l">
                    <T en="Handcrafted SKUs" np="हस्तनिर्मित" />
                  </div>
                </div>
              </div>
              <a href="#story" className="sk-btn sk-btn-outline" style={{ alignSelf: "flex-start" }}>
                <T en="Read Our Story →" np="हाम्रो कथा →" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
