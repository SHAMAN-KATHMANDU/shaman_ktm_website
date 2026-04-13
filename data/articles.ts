import type { Article, Influencer } from "@/types/product";

const img = (seed: string, w = 800, h = 500) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const articles: Article[] = [
  {
    slug: "authentic-rudraksha",
    title: "How to Choose Authentic Rudraksha Beads",
    excerpt:
      "Not all Rudraksha are equal. Learn how to identify genuine Nepali beads by face count, origin, and energy vibration.",
    tag: "Spiritual",
    image: img("shamanktm-art-rudraksha"),
    alt: "Rudraksha beads close-up",
  },
  {
    slug: "singing-bowl-meditation",
    title: "Singing Bowl Meditation for Beginners",
    excerpt:
      "Step-by-step guide to using your Tibetan singing bowl for meditation, stress relief, and sound healing at home.",
    tag: "Spiritual",
    image: img("shamanktm-art-meditation"),
    alt: "Singing bowl meditation",
  },
  {
    slug: "brass-silver-care",
    title: "How to Care for Brass & Silver Jewelry",
    excerpt:
      "Keep your Shaman jewelry gleaming with simple care tips — no special tools, just things from your kitchen.",
    tag: "Jewelry",
    image: img("shamanktm-art-care"),
    alt: "Brass and silver jewelry care",
  },
];

export const influencers: Influencer[] = [
  {
    name: "Priya Sharma",
    handle: "@priyasharma.ktm",
    followers: "45K followers",
    niche: "Lifestyle",
    image: img("shamanktm-inf-priya", 240, 240),
  },
  {
    name: "Rohan Travels",
    handle: "@rohantravels",
    followers: "120K followers",
    niche: "Travel",
    image: img("shamanktm-inf-rohan", 240, 240),
  },
  {
    name: "Ananya Wellness",
    handle: "@ananyawellness",
    followers: "88K followers",
    niche: "Wellness",
    image: img("shamanktm-inf-ananya", 240, 240),
  },
];

export const instagramPosts: { image: string; alt: string }[] = [
  { image: img("shamanktm-ig-1", 400, 400), alt: "Jewelry post" },
  { image: img("shamanktm-ig-2", 400, 400), alt: "Singing bowl post" },
  { image: img("shamanktm-ig-3", 400, 400), alt: "Statue post" },
  { image: img("shamanktm-ig-4", 400, 400), alt: "Decor post" },
  { image: img("shamanktm-ig-5", 400, 400), alt: "Furniture post" },
  { image: img("shamanktm-ig-6", 400, 400), alt: "Customer photo" },
];

export const ugcPhotos: { image: string; alt: string }[] = [
  { image: img("shamanktm-ugc-1", 800, 400), alt: "Customer photo" },
  { image: img("shamanktm-ugc-2", 400, 400), alt: "Gift photo" },
  { image: img("shamanktm-ugc-3", 400, 400), alt: "Singing bowl" },
  { image: img("shamanktm-ugc-4", 400, 400), alt: "Jewelry" },
  { image: img("shamanktm-ugc-5", 400, 400), alt: "Statue" },
  { image: img("shamanktm-ugc-6", 400, 400), alt: "Artisan at work" },
  { image: img("shamanktm-ugc-7", 400, 400), alt: "Home decor" },
];
