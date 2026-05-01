import type {
  ProductDetail,
  ProductSummary,
  ElementSlug,
} from "@/lib/api/types";
import { mockCategories } from "./categories";

const img = (seed: string) =>
  `https://picsum.photos/seed/sk-${seed}/720/960`;

const catId = (slug: ElementSlug): string =>
  mockCategories.find((c) => c.slug === slug)!.id;

interface SeedProduct {
  slug: string;
  name: string;
  element: ElementSlug;
  energy: string; // tag value, e.g. "Sound Healing"
  subCategory: string; // tag value, e.g. "Singing Bowls"
  price: number;
  compareAtPrice?: number;
  about: string;
  howToUse: string;
  story: string;
  badge?: "new" | "member";
  availability?: "online" | "showroom-only";
  featured?: boolean;
  imageSeed: string;
  extraImageSeeds?: string[];
}

const seeds: SeedProduct[] = [
  // ===== METAL =====
  {
    slug: "tibetan-singing-bowl-7in",
    name: 'Tibetan Singing Bowl — Hand-Hammered 7"',
    element: "metal",
    energy: "Sound Healing",
    subCategory: "Singing Bowls",
    price: 4500,
    compareAtPrice: 5400,
    about:
      "A seven-metal singing bowl hammered by hand in a small Patan workshop. Tuned for a deep, sustained resonance that fills a room without ever pushing.",
    howToUse:
      "Rest the bowl on the felt cushion. Strike the rim once to set the tone, then run the suede mallet around the outer edge in slow, steady circles. Let the room arrive before you begin.",
    story:
      "Metal is sound waiting to happen. In Patan, the smiths still work the same alloys their grandfathers worked, ringing each bowl against the bench until it answers in the voice they want.",
    featured: true,
    imageSeed: "bowl-1",
    extraImageSeeds: ["bowl-1b", "bowl-1c"],
  },
  {
    slug: "brass-meditation-bell",
    name: "Brass Meditation Bell — Cast & Polished",
    element: "metal",
    energy: "Focus",
    subCategory: "Bells",
    price: 1200,
    about:
      "A small brass bell cast and hand-polished, with a clean tone that lingers just long enough to mark the start or close of a sitting.",
    howToUse:
      "Hold by the wooden handle. A single, gentle strike at the start; another at the close. Let the silence after the bell do its work.",
    story:
      "The bell is the punctuation in a meditation practice. It says: begin. It says: rest now. Metal carries the instruction without ever using a word.",
    badge: "new",
    imageSeed: "bell-1",
  },
  {
    slug: "copper-water-vessel",
    name: "Copper Water Vessel — Lota Form",
    element: "metal",
    energy: "Purification",
    subCategory: "Vessels",
    price: 2800,
    about:
      'A traditional copper lota, hand-spun from a single sheet. Use overnight to draw copper into your morning water — an Ayurvedic practice older than most countries.',
    howToUse:
      "Fill at night, cover, and drink on waking. Rinse with lemon and salt once a week to keep the inside bright.",
    story:
      "Copper has been part of the kitchen and the temple for as long as either has existed in Nepal. Both rooms understand the same thing: what touches the water touches the body.",
    imageSeed: "copper-1",
  },
  {
    slug: "seven-metal-tingsha",
    name: "Seven-Metal Tingsha — Paired Cymbals",
    element: "metal",
    energy: "Cleansing",
    subCategory: "Cymbals",
    price: 1850,
    about:
      "A pair of small cymbals strung on a leather cord, made from the traditional seven-metal alloy. Bright, clear, and surprisingly long in the room.",
    howToUse:
      "Hold one cymbal in each hand by the cord. Strike the edges together — vertical strikes give a cleaner tone than flat ones.",
    story:
      "Tingsha cut through. They are how a Himalayan lama clears a space before a chant, and how a yoga teacher in Jhamsikhel still calls a class back from savasana.",
    featured: true,
    imageSeed: "tingsha-1",
  },

  // ===== EARTH =====
  {
    slug: "himalayan-salt-lamp-medium",
    name: "Himalayan Salt Lamp — Medium",
    element: "earth",
    energy: "Grounding",
    subCategory: "Lamps",
    price: 2200,
    compareAtPrice: 2600,
    about:
      "A solid block of Himalayan rock salt cradling a warm bulb. Soft amber light, naturally irregular form, weighted wooden base.",
    howToUse:
      "Place near a desk, bedside, or low corner. Wipe with a dry cloth — salt and water are old friends, but not for cleaning.",
    story:
      "Earth is the slow material. This salt was a sea before there was a country. It sits now, glowing, on a desk in Kathmandu. We try not to be in too much of a hurry around it.",
    featured: true,
    imageSeed: "salt-1",
    extraImageSeeds: ["salt-1b"],
  },
  {
    slug: "shungite-pyramid-50mm",
    name: "Shungite Pyramid — 50mm",
    element: "earth",
    energy: "Protection",
    subCategory: "Crystals",
    price: 2800,
    about:
      "A polished black shungite pyramid sourced from Karelia and finished by a small lapidary in Patan. Heavy in the hand, warm to hold.",
    howToUse:
      "Place at the desk near electronics, or carry in a small pouch when you travel. Rinse under running water occasionally.",
    story:
      "Earth keeps its old promises. Shungite has been doing what shungite does for two billion years — we just put a pyramid on it.",
    imageSeed: "shungite-1",
  },
  {
    slug: "rough-amethyst-cluster",
    name: "Rough Amethyst Cluster — Hand-Sized",
    element: "earth",
    energy: "Calm",
    subCategory: "Crystals",
    price: 3400,
    about:
      "An untreated amethyst cluster, kept rough at the base so the crystal points read clearly. Each piece is unique.",
    howToUse:
      "Set on a low shelf or near the bed. No charging, no rituals required — earth doesn't need a manual.",
    story:
      "Crystals are slow weather. This one took longer than your family tree to form. The least we can do is leave it somewhere we'll see it.",
    badge: "new",
    imageSeed: "amethyst-1",
  },
  {
    slug: "river-stone-trio",
    name: "River Stone Trio — Black Basalt",
    element: "earth",
    energy: "Stillness",
    subCategory: "Stones",
    price: 950,
    about:
      "Three black basalt stones smoothed by river years and finished with a light food-safe oil. Sized for the palm.",
    howToUse:
      "Stack them. Hold one. Carry one. There is no wrong way to keep a stone.",
    story:
      "Earth is patient. A river will polish a stone for a thousand years and then offer it to you for a thousand rupees. We try to honour the trade.",
    imageSeed: "stones-1",
  },

  // ===== WOOD =====
  {
    slug: "sandalwood-mala-108",
    name: "Sandalwood Mala — 108 Hand-Knotted Beads",
    element: "wood",
    energy: "Meditation",
    subCategory: "Malas",
    price: 1800,
    about:
      "A 108-bead japa mala turned from old-growth Mysore sandalwood, hand-knotted between every bead. The scent deepens with use.",
    howToUse:
      "Hold the mala over the middle finger of the right hand. Move bead by bead with the thumb, one mantra each. Pause at the guru bead — turn back rather than crossing it.",
    story:
      "Wood is devotion you can hold. A mala is the quiet metronome of a sit — and the sandal smell, after a year, is the smell of your own practice.",
    featured: true,
    imageSeed: "mala-1",
    extraImageSeeds: ["mala-1b", "mala-1c"],
  },
  {
    slug: "rudraksha-mala-5mukhi",
    name: "5 Mukhi Rudraksha Mala — Authenticated",
    element: "wood",
    energy: "Devotion",
    subCategory: "Malas",
    price: 2400,
    about:
      "Five-faced rudraksha beads from Nepal's mid-hills, hand-strung on cotton cord. Each bead checked under loupe for the five clean ridges.",
    howToUse:
      "Wear daily, or use for japa as you would any mala. The beads darken naturally with skin oil over time.",
    story:
      "The rudraksha is the seed of a tree that grows wild in Solukhumbu. Wood remembers where it came from — and lets the wearer remember too.",
    imageSeed: "rudraksha-1",
  },
  {
    slug: "carved-rosewood-incense-holder",
    name: "Carved Rosewood Incense Holder",
    element: "wood",
    energy: "Ritual",
    subCategory: "Holders",
    price: 1100,
    about:
      "A long rosewood plank with a single drilled stick-hole and a shallow ash channel. Hand-carved relief along one edge.",
    howToUse:
      "Place on a level surface. Insert the incense at the far end so the ash falls into the channel. Wipe the channel before each new stick.",
    story:
      "Wood holds the small repeated gestures: the stick, the match, the smoke. None of this changes the world. All of it changes the room.",
    badge: "new",
    imageSeed: "incense-1",
  },
  {
    slug: "wooden-meditation-bench",
    name: "Wooden Meditation Bench — Folding Pine",
    element: "wood",
    energy: "Stillness",
    subCategory: "Furniture",
    price: 4800,
    about:
      "A low pine bench with folding legs, sized for seiza-style sitting. Light to carry, steady on a mat.",
    howToUse:
      "Open the legs, place on a yoga mat or rug. Kneel astride with the seat under the hips. Adjust posture, then begin.",
    story:
      "Wood holds you. The bench is a quiet partner to a long sit — neither leading nor pushing, just there under the weight of attention.",
    imageSeed: "bench-1",
  },

  // ===== PLANT =====
  {
    slug: "cbd-hemp-oil-1000",
    name: "CBD Hemp Oil — 1000mg Full Spectrum",
    element: "plant",
    energy: "Calm",
    subCategory: "Oils",
    price: 3500,
    compareAtPrice: 4000,
    about:
      "Full-spectrum CBD oil pressed from hemp grown in Nepal's mid-hills. 1000mg per 30ml, MCT carrier, glass dropper bottle.",
    howToUse:
      "Place 0.5 to 1ml under the tongue. Hold for sixty seconds before swallowing. Start low, increase slowly.",
    story:
      "Plant is the slowest medicine. A field of hemp through one season, pressed at the right week, decanted into amber glass — the work is mostly waiting.",
    featured: true,
    imageSeed: "cbd-1",
    extraImageSeeds: ["cbd-1b"],
  },
  {
    slug: "ayurvedic-tulsi-tea",
    name: "Ayurvedic Tulsi Tea — Loose Leaf",
    element: "plant",
    energy: "Renewal",
    subCategory: "Teas",
    price: 850,
    about:
      "Sun-dried holy basil from a small farm in Kavre. Loose leaf, in a kraft pouch with a wax-lined inner bag.",
    howToUse:
      "One teaspoon per cup. Pour just-off-boil water and steep four minutes. Honey if you must — but tulsi has its own sweetness.",
    story:
      "Tulsi is the courtyard plant of every Nepali grandmother we know. Plant medicine that arrives by smell before it arrives by name.",
    imageSeed: "tulsi-1",
  },
  {
    slug: "neem-skin-balm",
    name: "Neem Skin Balm — 50g Tin",
    element: "plant",
    energy: "Renewal",
    subCategory: "Balms",
    price: 1450,
    about:
      "Cold-infused neem in beeswax and shea, with a faint forest scent. 50g, in a flat lidded tin.",
    howToUse:
      "Warm a little between fingertips and press into the skin. For irritated patches, apply twice daily.",
    story:
      "Neem is the skin's old friend. Plant takes time to learn — once it knows the body, it tends to keep showing up where the body needs it.",
    badge: "new",
    imageSeed: "neem-1",
  },
  {
    slug: "white-sage-bundle",
    name: "White Sage Bundle — Small",
    element: "plant",
    energy: "Cleansing",
    subCategory: "Smudge",
    price: 650,
    about:
      "A hand-tied bundle of white sage, ethically sourced and naturally dried. Burns slow, with a clean herbaceous smoke.",
    howToUse:
      "Light the tip, blow gently to coals, then walk the room with the smoke. A clay dish or shell to catch ash. Open a window.",
    story:
      "Plant is the smoke before the silence. We don't claim more than that — and the sage doesn't either.",
    imageSeed: "sage-1",
  },

  // ===== WATER =====
  {
    slug: "natural-spring-water-1l",
    name: "Natural Spring Water — Glass 1L",
    element: "water",
    energy: "Purity",
    subCategory: "Spring",
    price: 120,
    about:
      "Untreated Himalayan spring water, bottled at source in returnable glass. No additives, no minerals adjusted.",
    howToUse:
      "Open. Drink. Return the bottle on your next visit for a small refund.",
    story:
      "Water is the simplest argument we have. The spring is real. The bottle is glass. The price is what it costs to bring it down the hill.",
    featured: true,
    imageSeed: "water-1",
  },
  {
    slug: "blue-lotus-mist",
    name: "Blue Lotus Mist — 100ml",
    element: "water",
    energy: "Calm",
    subCategory: "Mist",
    price: 1650,
    about:
      "A face and pillow mist made from blue lotus hydrosol and a little jasmine. 100ml, amber glass, fine spray.",
    howToUse:
      "Spray over the face after cleansing, or over the pillow before sleep. Eyes closed for the spray.",
    story:
      "Water carries flowers across long distances. The mist is the lotus, distilled — a few drops of pond, made portable.",
    badge: "new",
    imageSeed: "mist-1",
  },
  {
    slug: "moonstone-pendant-silver",
    name: "Moonstone Pendant — Silver Bezel",
    element: "water",
    energy: "Flow",
    subCategory: "Jewelry",
    price: 2250,
    about:
      "A natural moonstone in a hand-set silver bezel, on an 18-inch sterling chain. The flash shifts with the light.",
    howToUse:
      "Wear close to the throat. Polish gently with a silver cloth — moonstone bruises easily.",
    story:
      "The moon pulls water. Moonstone, somehow, remembers being asked. We can't explain it any better than that.",
    imageSeed: "moonstone-1",
  },
  {
    slug: "ceramic-bath-bowl",
    name: "Ceramic Bath Bowl — Stoneware",
    element: "water",
    energy: "Ritual",
    subCategory: "Vessels",
    price: 1850,
    about:
      "A wide, shallow stoneware bowl, glazed inside in pale celadon. For warm-water foot rinses, salt soaks, or just to keep flowers floating.",
    howToUse:
      "Half-fill with warm water. Add salts if you wish. Sit, immerse, breathe out.",
    story:
      "Water needs a shape. The bowl is one of the oldest shapes — older than language. We try to keep ours uncomplicated.",
    imageSeed: "bowl-bath-1",
  },

  // ===== AIR =====
  {
    slug: "palo-santo-bundle",
    name: "Palo Santo Bundle — 6 Sticks",
    element: "air",
    energy: "Cleansing",
    subCategory: "Smudge",
    price: 750,
    about:
      "Six sticks of sustainably harvested palo santo, naturally fallen and aged. Sweet smoke, long burn.",
    howToUse:
      "Light the tip, hold flame for thirty seconds, then blow gently to coals. Walk the room with the smoke. Set on a heatproof dish to self-extinguish.",
    story:
      "Air is the messenger. Smoke says what could not be said. We try to source it the way the trees would prefer to be sourced.",
    featured: true,
    imageSeed: "palo-1",
    extraImageSeeds: ["palo-1b"],
  },
  {
    slug: "essential-oil-pine-fir",
    name: "Pine & Fir Essential Oil — 15ml",
    element: "air",
    energy: "Clarity",
    subCategory: "Oils",
    price: 1450,
    about:
      "A blend of Himalayan pine and silver fir, steam-distilled in small batches. 15ml in a frosted dropper bottle.",
    howToUse:
      "Three to five drops in a diffuser. For a steam, two drops in a bowl of just-off-boil water — towel over head, eyes closed.",
    story:
      "Air carries the highland. One drop in a small Kathmandu room, and the room moves up to four thousand metres.",
    imageSeed: "oil-1",
  },
  {
    slug: "canned-himalayan-oxygen",
    name: "Canned Himalayan Oxygen — 8L",
    element: "air",
    energy: "Clarity",
    subCategory: "Air",
    price: 1850,
    about:
      "Eight litres of Himalayan oxygen in a recyclable steel can. For travellers, trekkers, and city days when the air goes heavy.",
    howToUse:
      "Hold the mask close to nose and mouth, press the trigger, breathe slowly. Three to five breaths is usually enough.",
    story:
      "Air is the most overlooked thing we sell. Sometimes — at altitude, after a hard week — it's also the most useful.",
    availability: "showroom-only",
    imageSeed: "oxygen-1",
  },
  {
    slug: "incense-honey-resin",
    name: "Honey-Resin Incense — Hand-Rolled Sticks",
    element: "air",
    energy: "Ritual",
    subCategory: "Incense",
    price: 480,
    about:
      "Twenty hand-rolled incense sticks, blended with honey, frankincense, and benzoin. Slow burn, soft sweet smoke.",
    howToUse:
      "Light the tip, blow to ember, place in a holder. One stick perfumes a small room for about thirty minutes.",
    story:
      "Incense is the daily offering. Air takes it up. Whatever was on your mind tends to come down a little quieter.",
    badge: "new",
    imageSeed: "incense-2",
  },
];

export const mockProducts: ProductDetail[] = seeds.map((s, i) => {
  const id = `prod-${s.slug}`;
  const images = [s.imageSeed, ...(s.extraImageSeeds ?? [])].map(img);
  const description = [
    s.about,
    "",
    "## How to use",
    "",
    s.howToUse,
    "",
    "## Element story",
    "",
    s.story,
  ].join("\n");
  const tags = [s.energy, s.subCategory];
  if (s.badge) tags.push(s.badge);
  if (s.availability === "showroom-only") tags.push("showroom-only");
  const category = mockCategories.find((c) => c.slug === s.element)!;

  return {
    id,
    name: s.name,
    slug: s.slug,
    price: s.price,
    compareAtPrice: s.compareAtPrice,
    currency: "NPR",
    thumbnailUrl: images[0],
    categoryId: category.id,
    vendorId: null,
    variations: [
      {
        id: `${id}-default`,
        sku: s.slug.toUpperCase(),
        price: s.price,
        stock: 12 + i,
        attributes: {},
      },
    ],
    createdAt: new Date(2026, 3, 1 + i, 9).toISOString(),
    images,
    description,
    category: { id: category.id, name: category.name, slug: category.slug },
    tags,
  };
});

export function toSummary(p: ProductDetail): ProductSummary {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    thumbnailUrl: p.thumbnailUrl,
    categoryId: p.categoryId,
    vendorId: p.vendorId,
    variations: p.variations,
    createdAt: p.createdAt,
    tags: p.tags,
  };
}

// Frontend-only convenience helpers (mock layer uses these too).
export const mockProductSummaries: ProductSummary[] = mockProducts.map(toSummary);

export function findProductBySlug(slug: string): ProductDetail | undefined {
  return mockProducts.find((p) => p.slug === slug);
}

export function findProductById(id: string): ProductDetail | undefined {
  return mockProducts.find((p) => p.id === id);
}

export function getElementOf(p: ProductSummary | ProductDetail): ElementSlug | undefined {
  const cat = mockCategories.find((c) => c.id === p.categoryId);
  return cat?.slug as ElementSlug | undefined;
}
