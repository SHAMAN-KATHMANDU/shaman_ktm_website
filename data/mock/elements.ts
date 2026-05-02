import type { ElementMeta, ElementSlug } from "@/lib/api/types";

export const ELEMENTS: ElementMeta[] = [
  {
    slug: "metal",
    name: "Metal",
    icon: "◈",
    accent: "#9B8B6E",
    natureSource: "Forged in Kathmandu & Bhaktapur",
    energyDescription:
      "Resonance and clarity. Metal carries sound, focus, and the kind of stillness that lives at the centre of a singing bowl.",
  },
  {
    slug: "earth",
    name: "Earth",
    icon: "▣",
    accent: "#6B5E3A",
    natureSource: "Mined and gathered from Himalayan beds",
    energyDescription:
      "Grounding, weight, and patience. Earth holds you to the present and reminds the body where it stands.",
  },
  {
    slug: "wood",
    name: "Wood",
    icon: "❖",
    accent: "#3D5A2E",
    natureSource: "Carved from sustainable Nepali groves",
    energyDescription:
      "Growth and devotion. Wood is the slow craft — beads strung by hand, mala by mala, breath by breath.",
  },
  {
    slug: "plant",
    name: "Plant",
    icon: "✿",
    accent: "#4A6741",
    natureSource: "Wild-harvested across Nepal's mid-hills",
    energyDescription:
      "Calm and renewal. Plant is the leaf, the petal, the resin — life pressed gently into oils and infusions.",
  },
  {
    slug: "water",
    name: "Water",
    icon: "≋",
    accent: "#2A5A6B",
    natureSource: "Drawn from Himalayan springs",
    energyDescription:
      "Purity and flow. Water clears what is heavy and carries the body back toward its softer rhythm.",
  },
  {
    slug: "air",
    name: "Air",
    icon: "❋",
    accent: "#4A5270",
    natureSource: "Gathered from highland sage and pine",
    energyDescription:
      "Cleansing and intention. Air is the smoke that moves through a room and the breath that follows it.",
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
