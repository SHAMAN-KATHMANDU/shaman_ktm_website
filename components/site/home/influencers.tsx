import { influencers, instagramPosts } from "@/data/articles";
import { Reveal } from "../reveal";
import { T } from "../i18n/t";
import { InstagramIcon } from "../icons";

export function Influencers() {
  return (
    <section className="sk-section sk-dark">
      <div className="sk-wrap">
        <Reveal>
          <div className="sk-sec-top" style={{ marginBottom: 32 }}>
            <div className="sk-sec-tl">
              <p className="sk-eyebrow" style={{ color: "var(--sk-sage)" }}>
                <T en="Community Love" np="समुदाय" />
              </p>
              <h2 className="sk-section-h" style={{ color: "#fff" }}>
                <T en="As Seen With" np="तिनीहरूसँग" />
              </h2>
            </div>
            <a
              href="https://www.instagram.com/shamankathmandu"
              className="sk-view-all"
              style={{ color: "var(--sk-sage)" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              @shamankathmandu →
            </a>
          </div>
        </Reveal>
        <Reveal>
          <div className="sk-inf-grid">
            {influencers.map((inf) => (
              <div className="sk-inf-card" key={inf.handle}>
                <div className="sk-inf-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inf.image} alt={inf.name} loading="lazy" />
                </div>
                <div className="sk-inf-name">{inf.name}</div>
                <div className="sk-inf-handle">{inf.handle}</div>
                <div className="sk-inf-followers">
                  {inf.followers} · {inf.niche}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal>
          <div className="sk-insta-grid">
            {instagramPosts.map((post, i) => (
              <div className="sk-insta-post" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt={post.alt} loading="lazy" />
              </div>
            ))}
          </div>
        </Reveal>
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <a
            href="https://www.instagram.com/shamankathmandu"
            target="_blank"
            rel="noopener noreferrer"
            className="sk-btn sk-btn-ghost"
          >
            <InstagramIcon size={16} />
            &nbsp;Follow @shamankathmandu
          </a>
        </div>
      </div>
    </section>
  );
}
