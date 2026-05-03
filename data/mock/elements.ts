import type { ElementMeta, ElementSlug } from "@/lib/api/types";

export const ELEMENTS: ElementMeta[] = [
  {
    slug: "metal",
    name: "Metal",
    icon: "◈",
    accent: "#c9b58e",
    natureSource: "Formed through fire and time",
    energyDescription:
      "Clarity and precision. Metal holds structure, reflects light, and brings a quiet sense of focus.",
  },
  {
    slug: "earth",
    name: "Earth",
    icon: "▣",
    accent: "#b89c6a",
    natureSource: "Drawn from the foundations of nature",
    energyDescription:
      "Grounding and stability. Earth connects, supports, and reminds the body of its place in the present.",
  },
  {
    slug: "wood",
    name: "Wood",
    icon: "❖",
    accent: "#7fa066",
    natureSource: "Shaped by growth and time",
    energyDescription:
      "Warmth and intention. Wood carries the rhythm of slow making — shaped, held, and lived with.",
  },
  {
    slug: "plant",
    name: "Plant",
    icon: "✿",
    accent: "#8aab7a",
    natureSource: "Gathered from living systems",
    energyDescription:
      "Softness and renewal. Plant expresses life in its gentlest forms — subtle, restorative, and evolving.",
  },
  {
    slug: "water",
    name: "Water",
    icon: "≋",
    accent: "#6ba0b4",
    natureSource: "Flowing in its purest form",
    energyDescription:
      "Ease and movement. Water adapts, releases, and returns things to balance.",
  },
  {
    slug: "air",
    name: "Air",
    icon: "❋",
    accent: "#8a93b8",
    natureSource: "Present in every breath",
    energyDescription:
      "Lightness and clarity. Air moves unseen — carrying scent, space, and quiet transformation.",
  },
];

export const ELEMENT_BY_SLUG: Record<ElementSlug, ElementMeta> = ELEMENTS.reduce(
  (acc, el) => {
    acc[el.slug] = el;
    return acc;
  },
  {} as Record<ElementSlug, ElementMeta>,
);

export function getElement(slug: string): ElementMeta | undefined {
  return ELEMENT_BY_SLUG[slug as ElementSlug];
}

export const ELEMENT_SLUGS = ELEMENTS.map((e) => e.slug);
