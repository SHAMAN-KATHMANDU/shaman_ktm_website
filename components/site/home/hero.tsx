import Link from "next/link";
import { T } from "../i18n/t";

export function Hero() {
  return (
    <section className="sk-hero">
      <div className="sk-hero-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/shamanktm-hero/1920/1280"
          alt="Nepal artisan crafts"
        />
      </div>
      <div className="sk-hero-overlay" />
      <div className="sk-wrap" style={{ height: "100%" }}>
        <div className="sk-hero-content">
          <div className="sk-hero-pill">
            <div className="sk-hero-dot" />
            <T
              en="Handcrafted in Nepal · 1,064+ Unique Products"
              np="नेपालमा हातले बनाइएको · १,०६४+ उत्पादन"
            />
          </div>
          <h1 className="sk-hero-h1">
            <T
              en={
                <>
                  Handcrafted
                  <br />
                  in the <em>Himalayas.</em>
                </>
              }
              np={
                <>
                  हिमालयमा
                  <br />
                  <em>हातले बनाइएको।</em>
                </>
              }
            />
          </h1>
          <p className="sk-hero-sub sk-np-text">
            हातले बनाइएको, मनले महसुस गरिएको
          </p>
          <div className="sk-hero-btns">
            <Link href="/shop" className="sk-btn sk-btn-green">
              <T en="Shop Now →" np="अहिले किन्नुहोस् →" />
            </Link>
            <a href="#story" className="sk-btn sk-btn-ghost">
              ▶&nbsp;
              <T en="Our Story" np="हाम्रो कथा" />
            </a>
          </div>
        </div>
      </div>
      <div className="sk-hero-stats" aria-hidden>
        <div className="sk-stat-chip">
          <div className="sk-stat-chip-n">
            10<span>K+</span>
          </div>
          <div className="sk-stat-chip-l">Customers</div>
        </div>
        <div className="sk-stat-chip">
          <div className="sk-stat-chip-n">
            <span>3</span>
          </div>
          <div className="sk-stat-chip-l">Showrooms</div>
        </div>
        <div className="sk-stat-chip">
          <div className="sk-stat-chip-n">1,064</div>
          <div className="sk-stat-chip-l">Products</div>
        </div>
      </div>
    </section>
  );
}
