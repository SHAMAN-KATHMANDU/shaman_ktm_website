import type { ElementMeta, ElementSlug } from "@/lib/api/types";

export const ELEMENTS: ElementMeta[] = [
  {
    slug: "metal",
    name: "Metal",
    icon: "◈",
    accent: "#a98e52",
    natureSource: "Formed through fire and time",
    energyDescription:
      "Clarity and precision. Metal holds structure, reflects light, and brings a quiet sense of focus.",
    nameNe: "धातु",
    natureSourceNe: "आगो र समयबाट निर्मित",
    energyDescriptionNe:
      "स्पष्टता र शुद्धता। धातुले संरचना धान्छ, उज्यालो प्रतिबिम्बित गर्छ, र मनमा शान्त एकाग्रता ल्याउँछ।",
  },
  {
    slug: "earth",
    name: "Earth",
    icon: "▣",
    accent: "#8a6f4e",
    natureSource: "Drawn from the foundations of nature",
    energyDescription:
      "Grounding and stability. Earth connects, supports, and reminds the body of its place in the present.",
    nameNe: "पृथ्वी",
    natureSourceNe: "प्रकृतिको जगबाट लिइएको",
    energyDescriptionNe:
      "स्थिरता र जमिनसँगको जोड। पृथ्वीले जोड्छ, सहयोग गर्छ, र शरीरलाई वर्तमानमा रहन सम्झाउँछ।",
  },
  {
    slug: "wood",
    name: "Wood",
    icon: "❖",
    accent: "#77603f",
    natureSource: "Shaped by growth and time",
    energyDescription:
      "Warmth and intention. Wood carries the rhythm of slow making — shaped, held, and lived with.",
    nameNe: "काठ",
    natureSourceNe: "बढ्दै र समयसँगै आकार लिएको",
    energyDescriptionNe:
      "न्यानोपन र उद्देश्य। काठले बिस्तारो सिर्जनाको लय बोक्छ — आकार दिइएको, समातिएको, र सँगै बाँचिएको।",
  },
  {
    slug: "plant",
    name: "Plant",
    icon: "✿",
    accent: "#6b8456",
    natureSource: "Gathered from living systems",
    energyDescription:
      "Softness and renewal. Plant expresses life in its gentlest forms — subtle, restorative, and evolving.",
    nameNe: "बिरुवा",
    natureSourceNe: "जीवित प्रणालीबाट संकलित",
    energyDescriptionNe:
      "कोमलता र नवीनीकरण। बिरुवाले जीवनलाई सबैभन्दा सौम्य रूपमा व्यक्त गर्छ — सूक्ष्म, पुनर्स्थापनात्मक, र विकासशील।",
  },
  {
    slug: "water",
    name: "Water",
    icon: "≋",
    accent: "#5f7c82",
    natureSource: "Flowing in its purest form",
    energyDescription:
      "Ease and movement. Water adapts, releases, and returns things to balance.",
    nameNe: "पानी",
    natureSourceNe: "आफ्नै सबैभन्दा शुद्ध रूपमा बगिरहेको",
    energyDescriptionNe:
      "सहजता र गति। पानीले अनुकूलन गर्छ, छोड्छ, र कुराहरूलाई सन्तुलनमा फर्काउँछ।",
  },
  {
    slug: "air",
    name: "Air",
    icon: "❋",
    accent: "#8c99a6",
    natureSource: "Present in every breath",
    energyDescription:
      "Lightness and clarity. Air moves unseen — carrying scent, space, and quiet transformation.",
    nameNe: "हावा",
    natureSourceNe: "हरेक सासमा उपस्थित",
    energyDescriptionNe:
      "हल्कापन र स्पष्टता। हावा अदृश्य रूपमा चल्छ — सुगन्ध, खाली ठाउँ, र मौन परिवर्तन बोकेर।",
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
