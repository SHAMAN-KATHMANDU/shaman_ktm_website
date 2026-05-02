import type {
  ProductDetail,
  ProductSummary,
  ElementSlug,
} from "@/lib/api/types";
import { mockCategories } from "./categories";

const asset = (file: string) => `/${encodeURI(file)}`;

interface SeedProduct {
  slug: string;
  name: string;
  element: ElementSlug;
  energy: string; // tag value, e.g. "Sound Healing"
  subCategory: string; // tag value, e.g. "Singing Bowls"
  price: number;
  compareAtPrice?: number;
  short: string;
  long: string;
  care: string;
  badge?: "new" | "member";
  availability?: "online" | "showroom-only";
  featured?: boolean;
  image: string;
  extraImages?: string[];
  extraTags?: string[];
}

const seeds: SeedProduct[] = [
  // ===== METAL =====
  {
    slug: "singing-bowl",
    name: "Singing Bowl",
    element: "metal",
    energy: "Sound Healing",
    subCategory: "Singing Bowls",
    price: 4500,
    compareAtPrice: 5400,
    short:
      "Hand-hammered from a seven-metal alloy in the old workshops of Patan. Strike it once and feel what the room does next.",
    long: `This is not a decorative object. It is a sound instrument.

Made from an alloy of seven metals — copper, tin, zinc, iron, lead, silver, and gold — and hammered by hand in Patan's metalworking quarter. Each bowl takes two to three days to make. The tone is tested before it leaves the workshop.

A single strike produces a resonance that builds before it fades. At the right frequency, that sound does something physical — to the body, to the nervous system, to the quality of silence in a room.

Use it to open a sitting practice. To close a session. To reset a space before you begin something. We list a primary note where we can hear one cleanly. We include a striker with every bowl.

What leaves our showroom has been played in our hands first.`,
    care: `- Strike with the wooden mallet provided. Leather-wrapped end gives a long, sustained tone. Bare wood gives a sharper, cleaner strike.
- To play the rim: press the mallet to the outer wall with even pressure and move in a slow, steady circle. Start slower than feels natural.
- Store on the cushion. Keep away from prolonged heat or moisture.
- Clean with a dry cloth only. No soap, no water.
- If the tone dulls over time, a firm wipe with a dry cloth restores it.`,
    featured: true,
    image: "singing bowl 1.png",
    extraImages: ["singing bowl 2.png", "singing bowl 3.png"],
    extraTags: ["Sound Healing", "Singing Bowls", "Cleansing"],
  },

  // ===== AIR =====
  {
    slug: "canned-himalayan-oxygen",
    name: "Canned Himalayan Oxygen",
    element: "air",
    energy: "Vitality",
    subCategory: "Wellness",
    price: 1850,
    short:
      "10 litres of clean Himalayan air in a can. No frills — just oxygen, from altitude, delivered straight to the breath.",
    long: `Most people breathe without thinking about it. That is the problem.

At altitude, the air contains less. Your body has to work harder for the same intake. People who have spent time in the Himalaya know what that shortage feels like — and they know what happens when it resolves. The clarity that follows a clear, full breath at elevation is not metaphor. It is physiology.

Cleaner, thinner air than anything you find at valley level. It comes in a 10-litre pressurised can with an ergonomic nozzle. One breath. Then another.

We carry it under the Air element because air is an element — one we have forgotten to pay attention to. Use it after physical exertion, during a breathing practice, at altitude, or simply when the air in a room feels stale and the body needs a reset.

Pairs naturally with a Pranayama session. Works on its own too.`,
    care: `- Store upright in a cool, dry place. Do not expose to heat above 50°C.
- Do not puncture, incinerate, or crush the can.
- The nozzle delivers oxygen in controlled bursts — place over the mouth and nose, press and inhale slowly.
- For Pranayama use: take 2–3 inhalations before beginning the breathing set.
- Not for medical use. If you have a respiratory condition, consult a health professional.`,
    featured: true,
    image: "oxygen 1.png",
    extraImages: ["oxygen 2.png"],
    extraTags: ["Vitality", "Breath", "Clarity"],
  },

  // ===== EARTH (Bracelets — dual-element Earth + Water) =====
  {
    slug: "sunstone-pearl-bracelet",
    name: "Sunstone & Pearl Bracelet",
    element: "earth",
    energy: "Warmth",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "Raw sunstone chips carry the warmth of the earth — unpolished, direct, alive. Freshwater pearls carry the stillness of water. Together on one bracelet, they create a balance that most people spend years searching for. Vitality without restlessness. Calm without withdrawal. This is what nature's duality feels like on the wrist.",
    long: `Sunstone is not subtle. Its warm orange-peach surface catches light the way late afternoon catches a mountain ridge — fully, without apology. In the Shaman Kathmandu framework, sunstone belongs to the Earth element: grounding, structural, full of stored energy from the ground it came from.

Freshwater pearl is its opposite and its complement. Formed inside living water, the pearl carries fluidity, reflection, and the quiet calm of deep water. Where sunstone gives heat, pearl gives ease.

This bracelet was designed with that tension in mind. Raw chip-cut sunstones occupy one half — rough-edged, unpolished, textured. Small freshwater pearls occupy the other — round, smooth, luminous. Between them, gold seed beads hold the two worlds in conversation. The lobster clasp and gold extender chain allow the bracelet to be worn loose or fitted, a small choice that changes how it sits on the wrist.

Wear it when you need energy that doesn't burn you out. Wear it when stillness feels too passive and motion feels too much. The bracelet holds both, and lets you find the line between them.

**Element:** Earth (Sunstone — raw gemstone of the earth) + Water (Pearl — formed in freshwater)
**Origin:** Crystals sourced from mineral-rich regions. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Keep away from prolonged water exposure and direct sunlight. Wipe gently with a soft dry cloth. Store separately to avoid surface scratches on the pearl. Do not use chemical cleaners.`,
    image: "sunstone and pearl bracelet.JPG",
    extraTags: ["sunstone", "pearl", "dual-element", "earth", "water"],
  },
  {
    slug: "rose-quartz-pearl-bracelet",
    name: "Rose Quartz & Pearl Bracelet",
    element: "earth",
    energy: "Softness",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "Rose quartz is the earth's quietest stone. No heat, no shout — just a steady, pale pink presence that has been associated with emotional clarity for centuries. Paired with freshwater pearl, the bracelet becomes something more: two water-softened materials, one from the ground and one from a shell, meeting at your wrist.",
    long: `There is a reason rose quartz has appeared in healing traditions across cultures and centuries. The stone does not perform. It doesn't flash or demand attention. Its pale pink surface — rough-chipped here, showing its raw internal structure — simply holds a quality that is hard to name but easy to feel. In the Shaman Kathmandu framework, rose quartz sits in the Earth element: a stone born from mineral pressure, carrying the stability and grounding of the earth it came from.

Freshwater pearl brings Water. Formed over time inside a living shell in moving water, the pearl embodies fluidity, reflection, and emotional ease. Where the quartz offers a steady foundation, the pearl offers release.

This bracelet photographs beside water for a reason — the ocean stone it rests on, the wet surface, the dark reflective background all speak to the Water half of its identity. The design mirrors this duality precisely: rose quartz chips on one side, white freshwater pearls on the other, meeting at gold seed beads at the center. The lobster clasp with chain extender lets the bracelet adjust to any wrist.

Wear it when emotions feel heavy but not named. Wear it when you want to feel something soften — in the room, in yourself, in the day.

**Element:** Earth (Rose Quartz — raw crystal of the earth) + Water (Pearl — freshwater-born, shaped by water over time)
**Origin:** Rose quartz sourced from crystal mineral regions. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Avoid water, sweat, and prolonged sunlight (rose quartz can fade over time with UV exposure). Clean with a soft dry cloth only. Store in a pouch or separate compartment to protect pearl surface. No ultrasonic cleaners.`,
    image: "rose quartz and pearl bracelet.JPG",
    extraTags: ["rose-quartz", "pearl", "dual-element", "earth", "water"],
  },
  {
    slug: "green-aventurine-pearl-bracelet",
    name: "Green Aventurine & Pearl Bracelet",
    element: "earth",
    energy: "Growth",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "Green aventurine carries the energy of growth — the color of moss, of new leaves, of things that push through soil toward light. Freshwater pearl carries water's clarity. On the wrist, together, they create a bracelet for people who are in a season of becoming. Not arrived. Moving.",
    long: `Green aventurine is one of the most directly named stones in the crystal world. Its color — a deep, forest-floor green — makes the connection to nature immediate and physical. In the Shaman Kathmandu framework, aventurine belongs to the Earth element: formed within the earth, carrying the structural, generative energy of soil and mineral. It is also, uniquely, a stone most associated with growth — the expansion of possibilities, the clarity that comes before a good decision.

Freshwater pearl is Water: born inside a shell in a moving river, shaped slowly by the current around it. It carries fluidity, reflection, and the kind of calm that comes from being in process without rushing.

Together, these two create a bracelet that works well for a particular kind of moment. Not stillness for its own sake. Not intensity for its own sake. The combination suggests movement with clarity — the energy of someone who knows where they're going and isn't hurrying for the wrong reasons.

This bracelet is photographed on a mossy forest rock — damp, green, alive. That image is not incidental. It shows the bracelet in its natural context: somewhere between earth and water, surrounded by growth. The antique brass hardware and lobster clasp extender give it a warmer, more organic feel than gold, fitting for a piece whose energy is rooted in forest and river.

Wear it when you're starting something. Wear it in a season of decisions. Wear it when you want the energy of things that grow.

**Element:** Earth (Green Aventurine — crystal of the earth, forest energy) + Water (Pearl — freshwater-born, clarity of rivers)
**Origin:** Green aventurine sourced from mineral-rich regions. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Keep away from harsh chemicals and extended water immersion. Wipe with a soft dry cloth after wear. The antique brass hardware may develop a natural patina over time — this can be preserved or gently cleaned with a brass cloth. Store separately to protect pearl lustre.`,
    image: "aventurine and pearl bracelet.JPG",
    extraTags: ["green-aventurine", "pearl", "dual-element", "earth", "water"],
  },
  {
    slug: "white-howlite-pearl-bracelet",
    name: "White Howlite & Pearl Bracelet",
    element: "earth",
    energy: "Stillness",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "White howlite is the stone of silence. Its white surface crossed with grey veins looks like something the earth wrote to itself — a record of stillness held in mineral. Paired with freshwater pearl on a gold paperclip chain, this bracelet carries two kinds of quiet: one from the ground, one from the water.",
    long: `Howlite is not a stone that announces itself. No flash, no colour drama — just a white surface threaded with fine grey markings that run through it like breath. In the Shaman Kathmandu framework it belongs to the Earth element, and its particular quality within that element is stillness: the kind that comes not from emptiness but from something having settled.

The grey inclusions you see running through each square-cut stone are the stone's own formation lines — where minerals moved through the calcium silicate as it formed. No two pieces are identical. The square faceted cut shows all four sides of that pattern clearly, catching light at each angle.

Freshwater pearl brings Water. Formed inside a living shell in calm, slow-moving water, the pearl is the physical embodiment of patience turned into something luminous. Where howlite holds the quiet of solid ground, pearl holds the quiet of depth.

The gold paperclip chain links these two alternating elements with clean, architectural geometry. The result is a bracelet that feels modern in its construction but entirely natural in its materials. The lobster clasp with extension chain allows adjustment across wrist sizes.

Wear it when the noise is external. Wear it when you need to locate the part of yourself that is not reacting. This bracelet does not add energy — it clears space for what is already there.

**Element:** Earth (White Howlite — calcium silicate mineral, carries stillness) + Water (Pearl — freshwater-cultured, shaped in slow water)
**Origin:** Howlite sourced from mineral deposits. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Howlite is porous — keep away from water, oils, and perfumes as it can absorb them and discolor. Wipe gently with a dry cloth. Store separately from harder stones to avoid surface scratching. Avoid direct sunlight for extended periods.`,
    image: "white howlet and pearl bracelet.JPG",
    extraTags: ["white-howlite", "pearl", "dual-element", "earth", "water"],
  },
  {
    slug: "carnelian-pearl-bracelet",
    name: "Carnelian & Pearl Bracelet",
    element: "earth",
    energy: "Vitality",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "Carnelian has been worn for courage since before written history. Warriors carried it. Traders wore it. The stone's deep red-orange is not decoration — it is the compressed heat of the earth, cut and set into something you can carry daily. Paired with pearl on a gold paperclip chain, the heat finds its balance.",
    long: `There is no subtlety to carnelian. The stone is bold — a deep, saturated red-orange that moves between fire and rust depending on the light. Each square-faceted piece in this bracelet shows the full spectrum of a single carnelian: the deep red core, the amber edges, the semi-transparent facet faces that let light pass through and turn warm. In the Shaman Kathmandu framework, carnelian is Earth at its most active — not the stillness of howlite or the grounding of obsidian, but the stored vitality of a mineral that has been building pressure for a long time.

Carnelian has one of the longest histories of any stone in human adornment. It appears in ancient Egyptian burial sites, Mesopotamian cylinder seals, Roman signet rings. It was not decorative in those contexts — it was protective and activating. The association was always with vitality, courage, and the willingness to act.

Freshwater pearl is the counterweight. Water to fire. Calm to heat. The small cream pearls spaced between the carnelian squares do not compete with the stone's intensity — they create breathing room for it. The alternating rhythm of the bracelet — red stone, pearl, chain, red stone — is the rhythm of action and release.

The gold paperclip chain brings all of it together with a clean, urban structure that makes this bracelet work as well with a work outfit as it does on a travel day.

Wear it when you need to move. Wear it before something that matters. Wear it when courage is the point.

**Element:** Earth (Carnelian — silica mineral, carries stored fire and vitality) + Water (Pearl — freshwater-cultured, balancing fluidity)
**Origin:** Carnelian sourced from mineral-rich regions. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Carnelian is durable but can fade with long UV exposure — avoid leaving in direct sunlight. Clean with a damp cloth and dry immediately. Pearl surfaces are delicate — avoid perfumes, lotions, and chemicals. Store in a soft pouch.`,
    image: "carnelian and pearl bracelet.JPG",
    extraImages: ["carnelian and pearl bracelet (1).JPG"],
    extraTags: ["carnelian", "pearl", "dual-element", "earth", "water", "fire-stone"],
  },
  {
    slug: "tigers-eye-pearl-bracelet",
    name: "Tiger's Eye & Pearl Bracelet",
    element: "earth",
    energy: "Focus",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "Tiger's eye is the stone of sharp attention. Its deep amber-brown surface carries a chatoyant shimmer — a live optical effect where light moves through the stone as you turn it, like a cat's eye tracking movement. No other stone does this. Paired with baroque and seed pearls on a fine gold chain, it becomes something for people who want presence without performance.",
    long: `Tiger's eye earns its name every time light hits it. The chatoyancy — that moving band of golden light that shifts as the bracelet moves — is not a surface treatment or polish effect. It is the stone's own internal structure: parallel fibrous inclusions of crocidolite that were replaced by quartz and iron oxide over millions of years, preserving the orientation and creating the optical phenomenon. The deep amber-brown base color shifts toward gold and olive depending on the angle. Each smooth oval cabochon in this bracelet shows the full character of the stone.

In the Shaman Kathmandu framework, tiger's eye is Earth at its most focused. Where carnelian gives heat and sunstone gives warmth, tiger's eye gives clarity of attention — the quality of seeing a situation completely before acting. It has been used historically as a protective stone, but the more accurate description is that it sharpens perception. It helps you see what is actually there.

This bracelet pairs tiger's eye ovals with two sizes of freshwater pearl: larger baroque pearls that sit between the stones, and smaller seed pearls that fill the fine gold chain. The result is texturally rich — the shimmer of the stone, the soft luminosity of the baroque pearls, the tiny dot rhythm of the seed pearls along the chain. It is a bracelet that rewards close attention, which is appropriate for what it carries.

The fine delicate gold chain gives this bracelet a lighter feel than its weight would suggest. Lobster clasp with extender chain.

Wear it when focus is the requirement. Wear it before a decision. Wear it when you need to see clearly and move slowly enough to see well.

**Element:** Earth (Tiger's Eye — silicate mineral with chatoyant fibrous structure, carries focused earth energy) + Water (Pearl — freshwater-cultured, baroque and seed, fluidity and patience)
**Origin:** Tiger's eye sourced from mineral-rich deposits. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Tiger's eye is durable (Mohs 7) but avoid harsh chemicals and ultrasonic cleaners. The chatoyancy is natural — no treatment needed. Clean with a soft dry cloth. Freshwater pearl is delicate — keep away from perfume, sweat, and cosmetics. Store in a soft pouch to protect both stone and pearl surface. Unclasp the fine chain before storing.`,
    image: "tigers eye and pearl bracelet.JPG",
    extraTags: ["tigers-eye", "pearl", "dual-element", "earth", "water", "chatoyant-stone"],
  },
  {
    slug: "prehnite-pearl-bracelet",
    name: "Prehnite & Pearl Bracelet",
    element: "earth",
    energy: "Renewal",
    subCategory: "Jewelry",
    price: 3200,
    short:
      "Prehnite is a pale green mineral — the color of early spring, of the first leaves before they fully open. Each smooth oval cabochon is translucent at the edges, opaque at the center, like light caught in shallow water. Paired with small baroque pearls on a fine gold chain, this is the most quietly powerful bracelet in the collection.",
    long: `Prehnite is not a well-known stone, and that is part of what makes it rare in jewelry. Its color sits in a very specific range — a soft, translucent mint green that is lighter than jade, cooler than aventurine, and more alive than pale tourmaline. Each smooth oval cabochon carries that color differently: some more translucent, some more opaque, some with a slight internal haze that gives them depth. Cut smooth rather than faceted, the stones show their full character — rounded, soft-edged, without sharp angles.

In the Shaman Kathmandu framework, prehnite sits at the intersection of Earth and Wood. Its mineral nature places it in the Earth element — born from hydrothermal activity, carrying the structural energy of the ground. But its green color and its strong association with renewal, inner knowing, and the kind of clarity that comes before a good decision link it closely to Wood energy as well. This is one of the few stones that genuinely bridges both. For this bracelet, its primary classification is Earth + Water: stone from the earth, pearl from the water, both carrying a soft but persistent kind of power.

Small baroque freshwater pearls alternate with the prehnite cabochons on a fine delicate gold chain — a lighter construction than the paperclip chain bracelets, which makes this one sit differently on the wrist. More delicate. More close to the skin. The lobster clasp with extender allows adjustment.

Wear it when you're in a period of quiet change. Wear it when you want clarity without intensity. Wear it when the transition is already underway and you just need to stay present for it.

**Element:** Earth (Prehnite — hydrothermal mineral, carries ground energy and renewal) + Water (Pearl — freshwater-cultured, shaped by slow water)
**Origin:** Prehnite sourced from mineral deposits. Pearls freshwater-cultured. Assembled in Kathmandu.`,
    care: `Prehnite is relatively soft (Mohs 6–6.5) — avoid contact with harder stones and abrasive surfaces. Keep away from harsh chemicals and prolonged water exposure. Wipe with a soft dry cloth. Store in a soft pouch. The fine chain is delicate — unclasp before storing to prevent tangling.`,
    image: "prehnite and pearl bracelet.JPG",
    extraTags: ["prehnite", "pearl", "dual-element", "earth", "water"],
  },

  // ===== WOOD =====
  {
    slug: "ganesh-statue",
    name: "Hand-carved Wooden Ganesh Statue",
    element: "wood",
    energy: "Beginnings",
    subCategory: "Statues",
    price: 5500,
    short:
      "Hand-carved from solid saur wood — a dense, warm-grained hardwood that holds detail well and ages beautifully. Ganesh is the opener of paths. Keep one at the threshold, the desk, or wherever the next thing begins.",
    long: `Ganesh is not a symbol. He is a presence — one of the most consistently understood deities across every tradition that has carried him for two thousand years. The remover of obstacles. The setter of beginnings. The one you ask before you start.

This statue is carved by hand from solid saur wood — a dense tropical hardwood with a warm amber-brown grain and natural tonal variation that makes each piece different from the last. Saur wood is chosen by carvers who need a material that can hold fine detail without splitting: the curve of the trunk, the crown, the modak held in the hand, the layered fabric at the base. These are not printed or moulded. They are cut, by hand, by someone who has been doing this for a long time.

Saur wood sits in the Wood element of the Shaman Kathmandu framework — organic, growth-carrying, alive with the energy of a tree that stood before it became this. The warmth in the grain is not a finish or a stain. It is the wood's own color, brought out by the carving and a light natural oil treatment.

We source from carvers in Kathmandu's old quarters. Each piece is finished and inspected before it reaches the showroom. No two are identical — the grain pattern, the tone, the precise finish of each detail will differ slightly between pieces. That is the nature of hand work and natural wood.

Place it at an entrance, on a work desk, or wherever you begin things. That is what it is for.

**Element:** Wood (Saur/Acacia wood — tropical hardwood, growth energy, organic life)
**Origin:** Carved in Kathmandu by local artisans. Saur wood sourced from sustainable timber.`,
    care: `Dust with a soft, dry cloth. Do not use water or chemical cleaners on carved wood. Avoid prolonged direct sunlight — saur wood may dry or lighten over time. If the wood appears dry, apply a small amount of natural wood oil (teak oil or coconut oil) with a cloth and let it absorb overnight. Keep away from moisture and high humidity — wood expands and contracts, which can affect carving detail over time. This is a sacred object in the Nepali Hindu tradition. Handle accordingly.`,
    featured: true,
    image: "ganesh 3.png",
    extraImages: ["ganesh2.png"],
    extraTags: ["ganesh", "saur-wood", "carved-statue", "sacred-object"],
  },
];

export const mockProducts: ProductDetail[] = seeds.map((s, i) => {
  const id = `prod-${s.slug}`;
  const images = [s.image, ...(s.extraImages ?? [])].map(asset);
  const description = [
    s.short,
    "",
    "## Description",
    "",
    s.long,
    "",
    "## Care Instructions",
    "",
    s.care,
  ].join("\n");
  const tags = [s.energy, s.subCategory, ...(s.extraTags ?? [])];
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
