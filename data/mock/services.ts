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
];

export function findServiceBySlug(slug: string): Service | undefined {
  return mockServices.find((s) => s.slug === slug);
}
