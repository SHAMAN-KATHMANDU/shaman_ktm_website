import { SiteShell } from "../layout/site-shell";
import { Hero } from "./hero";
import { TrustStrip } from "./trust-strip";
import { CategoryGrid } from "./category-grid";
import { Bestsellers } from "./bestsellers";
import { Story } from "./story";
import { FeaturedBento } from "./featured-bento";
import { Articles } from "./articles";
import { Influencers } from "./influencers";
import { SocialProof } from "./social-proof";
import { MemberBanner } from "./member-banner";

export function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <TrustStrip />
      <CategoryGrid />
      <Bestsellers />
      <Story />
      <FeaturedBento />
      <Articles />
      <Influencers />
      <SocialProof />
      <MemberBanner />
    </SiteShell>
  );
}
