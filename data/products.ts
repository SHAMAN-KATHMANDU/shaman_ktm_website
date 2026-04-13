import type { Product } from "@/types/product";

const img = (seed: string) => `https://picsum.photos/seed/${seed}/720/900`;

export const products: Product[] = [
  {
    slug: "tibetan-singing-bowl-6in",
    name: 'Tibetan Singing Bowl — Hand-Hammered 6"',
    category: "spiritual",
    categoryLabel: "Spiritual",
    price: 1600,
    wasPrice: 2000,
    image: img("shamanktm-bowl"),
    alt: "Tibetan hand-hammered singing bowl",
    description:
      "Hand-hammered in the Kathmandu valley, this 6-inch Tibetan singing bowl is tuned for deep, grounding resonance. Includes a wooden mallet and felt ring cushion.",
    badge: { kind: "off", percent: 20 },
    featured: true,
  },
  {
    slug: "rudraksha-mala-108",
    name: "5 Mukhi Rudraksha Mala — 108 Beads",
    category: "spiritual",
    categoryLabel: "Spiritual",
    price: 2400,
    image: img("shamanktm-mala"),
    alt: "Rudraksha mala with 108 beads",
    description:
      "Authentic 5 Mukhi Rudraksha beads sourced from Nepal's foothills. 108 hand-knotted beads for meditation and japa practice.",
    badge: { kind: "new" },
    featured: true,
  },
  {
    slug: "lotus-brass-bracelet",
    name: "Lotus Brass Bracelet — Adjustable",
    category: "jewelry",
    categoryLabel: "Jewelry",
    price: 680,
    wasPrice: 800,
    image: img("shamanktm-bracelet"),
    alt: "Adjustable brass lotus bracelet",
    description:
      "An adjustable brass bracelet featuring a cast lotus motif. Hand-finished in a small Patan workshop.",
    badge: { kind: "off", percent: 15 },
    featured: true,
  },
  {
    slug: "large-dreamcatcher-boho",
    name: "Large Dreamcatcher — Boho Feather Design",
    category: "home-decor",
    categoryLabel: "Home Decor",
    price: 1200,
    image: img("shamanktm-dreamcatcher"),
    alt: "Large boho dreamcatcher with feathers",
    description:
      "A large dreamcatcher with natural cotton webbing, wooden beads, and ethically sourced feathers. Perfect above a bed or reading nook.",
    featured: true,
  },
  {
    slug: "crystal-singing-bowl-8in",
    name: 'Crystal Singing Bowl — Clear Quartz 8"',
    category: "spiritual",
    categoryLabel: "Spiritual",
    price: 8500,
    image: img("shamanktm-crystal-bowl"),
    alt: "Clear quartz crystal singing bowl",
    description:
      "Pure clear quartz crystal singing bowl, 8 inches, tuned to C note (root chakra). Ships with silicone ring and suede mallet.",
    featured: true,
  },
  {
    slug: "ganesh-wooden-statue",
    name: "Ganesh Wooden Statue — Carved Mango Wood",
    category: "statues",
    categoryLabel: "Statues",
    price: 3200,
    image: img("shamanktm-ganesh"),
    alt: "Hand-carved wooden Ganesh statue",
    description:
      "Hand-carved from sustainable mango wood by Bhaktapur artisans. Each statue is unique — knots and grain variations are part of the craft.",
    featured: true,
  },
  {
    slug: "moon-star-silver-earrings",
    name: "Moon & Star Silver Drop Earrings",
    category: "jewelry",
    categoryLabel: "Jewelry",
    price: 900,
    wasPrice: 1200,
    image: img("shamanktm-earrings"),
    alt: "Silver moon and star drop earrings",
    description:
      "925 sterling silver drop earrings featuring a crescent moon and tiny star. Lightweight and hypoallergenic.",
    badge: { kind: "off", percent: 25 },
  },
  {
    slug: "coconut-shell-lampshade",
    name: "Coconut Shell Lampshade — Natural Finish",
    category: "home-decor",
    categoryLabel: "Home Decor",
    price: 1850,
    image: img("shamanktm-coconut-lamp"),
    alt: "Coconut shell lampshade with natural finish",
    description:
      "A warm, textured lampshade crafted from whole coconut shells. E27 fitting, fits any standard pendant cord.",
    badge: { kind: "new" },
  },
  {
    slug: "buddha-brass-figurine",
    name: "Meditating Buddha — Antique Brass Finish",
    category: "statues",
    categoryLabel: "Statues",
    price: 2800,
    image: img("shamanktm-buddha"),
    alt: "Brass meditating Buddha figurine",
    description:
      "Sand-cast brass Buddha in meditation pose with an antique patina finish. 8 inches tall, weighted base.",
  },
  {
    slug: "macrame-hanging-chair",
    name: "Macramé Hanging Chair — Natural Cotton",
    category: "furniture",
    categoryLabel: "Furniture",
    price: 9500,
    image: img("shamanktm-macrame-chair"),
    alt: "Macrame hanging chair",
    description:
      "Hand-knotted macramé hanging chair in natural cotton. Supports up to 120 kg. Ceiling hardware included.",
  },
  {
    slug: "himalayan-gift-box",
    name: "Himalayan Gift Box — Curated Sampler",
    category: "gifts",
    categoryLabel: "Gifts",
    price: 2200,
    image: img("shamanktm-gift-box"),
    alt: "Curated gift box with Nepali handicrafts",
    description:
      "A curated gift set: mini singing bowl, rudraksha bracelet, hand-rolled incense, and a folded prayer flag. Gift-wrapped.",
    badge: { kind: "new" },
  },
  {
    slug: "rattan-pendant-lamp",
    name: "Rattan Pendant Lamp — Hand-Woven",
    category: "home-decor",
    categoryLabel: "Home Decor",
    price: 3400,
    image: img("shamanktm-rattan-lamp"),
    alt: "Hand-woven rattan pendant lamp",
    description:
      "Hand-woven rattan pendant casting warm, spoked shadows. Natural finish, E27 fitting, 40 cm diameter.",
  },
];

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);

export const getFeaturedProducts = (): Product[] =>
  products.filter((p) => p.featured);

export const getRelatedProducts = (
  product: Product,
  limit = 4,
): Product[] =>
  products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, limit);
