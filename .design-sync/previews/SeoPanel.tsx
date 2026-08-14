import type { SeoState } from "shamanktm-website";
import { SeoPanel } from "shamanktm-website";

export function Complete() {
  const state: SeoState = {
    seoTitle: "Full Moon Singing Bowl 8″ | Shaman Kathmandu",
    seoDescription:
      "Hand-carved Himalayan singing bowl tuned to heart chakra. Perfect for meditation, sound therapy, and healing practices.",
    ogImageUrl: "https://media.shamankathmandu.com/fm-bowl-8-og.jpg",
    canonicalUrl: "",
    noindex: false,
    twitterCard: "summary_large_image",
  };

  return (
    <SeoPanel
      state={state}
      onChange={() => {}}
      pathPrefix="/products"
      slug="full-moon-singing-bowl-8-inch"
      fallbackTitle="Full Moon Singing Bowl 8″"
      fallbackDescription="Hand-carved Himalayan singing bowl."
    />
  );
}

export function Minimal() {
  const state: SeoState = {
    seoTitle: "",
    seoDescription: "",
    ogImageUrl: "",
    canonicalUrl: "",
    noindex: false,
    twitterCard: "summary_large_image",
  };

  return (
    <SeoPanel
      state={state}
      onChange={() => {}}
      pathPrefix="/collections"
      slug="meditation-bowls"
      fallbackTitle="Meditation Bowls"
      fallbackDescription="A curated selection of authentic singing bowls."
    />
  );
}

export function Noindex() {
  const state: SeoState = {
    seoTitle: "Rudraksha Mala · 108 beads",
    seoDescription: "Authentic rudraksha beads from Nepal. 108-bead traditional mala for meditation and spiritual practice.",
    ogImageUrl: "https://media.shamankathmandu.com/mala-og.jpg",
    canonicalUrl: "https://example.com/canonical-source",
    noindex: true,
    twitterCard: "summary",
  };

  return (
    <SeoPanel
      state={state}
      onChange={() => {}}
      pathPrefix="/products"
      slug="rudraksha-mala-108-beads"
      fallbackTitle="Rudraksha Mala · 108 beads"
      fallbackDescription="Traditional meditation mala."
    />
  );
}
