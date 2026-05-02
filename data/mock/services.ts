import type { Service } from "@/lib/api/types";

const img = (seed: string) =>
  `https://picsum.photos/seed/sk-svc-${seed}/1280/720`;

export const mockServices: Service[] = [
  {
    slug: "tibetan-bowl-therapy",
    name: "Tibetan Bowl Therapy",
    element: "metal",
    duration: "60 min",
    pricePerSession: 2500,
    hero: img("bowl-therapy"),
    summary:
      "A one-hour sound bath layered with hand-hammered Tibetan bowls, tingsha, and a long, slow drone.",
    whatToExpect: [
      "A short intake conversation, then forty-five minutes lying down under a wool blanket.",
      "Bowls placed on and around the body for direct vibration.",
      "Closing with a tingsha and a quiet five minutes before you leave the room.",
    ],
    relatedProductSlugs: ["singing-bowl"],
  },
  {
    slug: "surya-namaskar-deep",
    name: "Surya Namaskar Deep",
    element: "air",
    duration: "75 min",
    pricePerSession: 1200,
    hero: img("surya"),
    summary:
      "A morning practice of slow, full Surya Namaskar A and B with attention to breath, joint stacking, and floor work between rounds.",
    whatToExpect: [
      "Doors open at sunrise. Tea on arrival.",
      "Twelve unhurried rounds of Surya A, then six of Surya B, then a long savasana.",
      "Suitable for steady beginners; not a flow class.",
    ],
    relatedProductSlugs: ["canned-himalayan-oxygen", "ganesh-statue"],
  },
  {
    slug: "pranayama-flow",
    name: "Pranayama Flow",
    element: "air",
    duration: "45 min",
    pricePerSession: 1000,
    hero: img("pranayama"),
    summary:
      "A breath-only session: nadi shodhana, kapalabhati, bhramari, and a long counted ujjayi to close.",
    whatToExpect: [
      "Bring a cushion or block. Eat lightly beforehand.",
      "Twenty minutes of structured technique, twenty of free practice, five of silence.",
    ],
    relatedProductSlugs: ["canned-himalayan-oxygen"],
  },
  {
    slug: "crystal-grid-alignment",
    name: "Crystal Grid Alignment",
    element: "earth",
    duration: "75 min",
    pricePerSession: 3000,
    hero: img("crystal"),
    summary:
      "A grid of selected stones laid around the body for an extended grounding session, with sound at intervals.",
    whatToExpect: [
      "A short intake to choose the grid pattern.",
      "Sixty minutes lying still — bowls and bell at intervals.",
      "Quiet tea afterwards before you leave the showroom.",
    ],
    relatedProductSlugs: ["white-howlite-pearl-bracelet", "tigers-eye-pearl-bracelet"],
  },
  {
    slug: "forest-bathing-guide",
    name: "Forest Bathing Guide",
    element: "wood",
    duration: "3 hours",
    pricePerSession: 2000,
    hero: img("forest"),
    summary:
      "A guided shinrin-yoku session in the pine and rhododendron forest above Kathmandu — slow walking, long stops, very few words.",
    whatToExpect: [
      "Meet at a parking point above Shivapuri. Light snacks provided.",
      "Three hours of slow movement and structured pauses.",
      "Closing tea on the return.",
    ],
    relatedProductSlugs: ["ganesh-statue", "green-aventurine-pearl-bracelet"],
  },
  {
    slug: "aromatherapy-blending",
    name: "Aromatherapy Blending",
    element: "plant",
    duration: "90 min",
    pricePerSession: 1800,
    hero: img("aroma"),
    summary:
      "A workshop session — choose, blend, and bottle a personal oil from a tray of single-distilled essentials.",
    whatToExpect: [
      "A short intake on intention and skin type.",
      "Sniff-test, build the blend, and decant into a small amber bottle to take home.",
    ],
    relatedProductSlugs: ["prehnite-pearl-bracelet"],
  },
];

export function findServiceBySlug(slug: string): Service | undefined {
  return mockServices.find((s) => s.slug === slug);
}
