import type { BlogCategory, BlogPostDetail } from "@/lib/api/types";

const img = (seed: string) =>
  `https://picsum.photos/seed/sk-story-${seed}/1280/720`;

interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string };
  tags: string[];
  publishedAt: string;
  readingMinutes: number;
  body: string;
  imageSeed: string;
}

const seeds: SeedPost[] = [
  {
    slug: "shaman-stories-the-origin",
    title: "Shaman Stories: A Return to the Elements — Episode 01: The Origin",
    excerpt:
      "Introducing Shaman Stories. Not a narrative of belief — an invitation to experience. In metal. In seed. In air. In earth. In water. Shakti lives within it all.",
    category: { slug: "shaman-stories", name: "Shaman Stories" },
    tags: ["element:metal", "element:earth", "element:water", "element:air", "Shaman Stories"],
    publishedAt: "2026-05-02T09:00:00.000Z",
    readingMinutes: 5,
    imageSeed: "shaman-stories-origin",
    body: `Introducing Shaman Stories by Shaman Kathmandu.

This is not a narrative of belief.
It is an invitation to experience.

A journey into:

- The elements
- The unseen forces
- The intelligence of nature
- The memory within matter
- The silence that speaks louder than words

This is where ancient understanding meets present awareness.

---

## Episode 01: The Origin 🌿

This is the beginning of remembering.

> शक्ति बाहिर होईन।
> यही सृष्टिभित्र छ।

Power is not outside you.
It exists within creation itself.

In metal. In seed. In air. In earth. In water.
Shakti lives within it all.

---

## The Experience of the Elements

### Metal

Not just material but vibration.
Every strike, every resonance carries intention.

### Seed

A universe in waiting.
Life folded into silence.

### Air

Invisible yet alive.
The first and last companion of existence.

### Earth

Memory that never forgets.
Foundation of all form.

### Water

Stillness that moves.
Emotion without resistance.

---

## A Different Kind of Knowing

This is not knowledge to be learned.
It is awareness to be felt.

For centuries, we've searched for answers outside only to realize they were always within nature.

From the voice of metal to the memory within a seed, from breath in the mountains to the stillness of water — everything is connected. Everything is alive.

---

## Shaman Kathmandu

A nature + energy philosophy brand rooted in the Himalayas, Shaman Kathmandu explores the intersection of:

- Sound
- Material
- Consciousness
- Ritual
- Natural intelligence

Not as escape from modern life but as a deeper way of living within it.

---

## Begin the Journey

This is not the end of something.
This is the beginning of remembering.

This is where it begins.

Introducing **#ShamanStories** — a journey into the elements, the unseen, and the wisdom that has always been here.

---

### Episode 01: The Origin 🌿

By Shaman Kathmandu

In metal. In seed. In air. In earth. In water.
Shakti lives within it all.`,
  },
  {
    slug: "the-sound-of-patan",
    title: "The Sound of Patan",
    excerpt:
      "An afternoon with the smiths who hammer the singing bowls we sell, and the alloy that has been ringing through their courtyard for four generations.",
    category: { slug: "sound-healing", name: "Sound Healing" },
    tags: ["element:metal", "Sound Healing", "product:singing-bowl"],
    publishedAt: "2026-04-12T09:00:00.000Z",
    readingMinutes: 6,
    imageSeed: "patan",
    body: `In a small workshop off the Patan square, a man named Bhakta has been turning a hammer for forty-one years. The bench he works at is older than that. The alloy is older still.\n\nWe stopped by on a Tuesday with a small crew and a microphone. The video is below — turn the sound up if you can.\n\nThe seven-metal bowl is one of those objects that doesn't translate well to a webpage. You hear it once, in a room, and then you understand. We brought a few back. They're in the listing.`,
  },
  {
    slug: "salt-from-the-ancient-sea",
    title: "Salt from the Ancient Sea",
    excerpt:
      "How a 250-million-year-old seabed ended up as a lamp on a Kathmandu desk — and why the slowness of it matters.",
    category: { slug: "documentary", name: "Documentary" },
    tags: ["element:earth", "Grounding", "product:white-howlite-pearl-bracelet"],
    publishedAt: "2026-03-28T09:00:00.000Z",
    readingMinutes: 5,
    imageSeed: "salt",
    body: `Most of the Himalayas were once underwater. The salt we sell as lamps came out of that sea, then sat for a quarter of a billion years before anyone got curious.\n\nWe try not to forget that when we set the price.`,
  },
  {
    slug: "sandalwood-at-dawn",
    title: "Sandalwood at Dawn",
    excerpt:
      "A morning sit with a 108-bead mala, and what changes after a year of doing it the same way every day.",
    category: { slug: "meditation", name: "Meditation" },
    tags: ["element:wood", "Meditation", "product:ganesh-statue"],
    publishedAt: "2026-03-14T06:00:00.000Z",
    readingMinutes: 4,
    imageSeed: "sandalwood",
    body: `Wood is patient. The mala teaches you how to be patient back.\n\nThis is a short note about a long practice. There's no trick to it. There's not even much of a story. There is just a bead, and another bead, and the smell of the sandalwood deepening over months.`,
  },
  {
    slug: "hemp-fields-of-the-mid-hills",
    title: "Hemp Fields of the Mid-Hills",
    excerpt:
      "A short documentary on the small farm in Kavre that grows the hemp for our CBD oil, and the family who has been working that land for three generations.",
    category: { slug: "documentary", name: "Documentary" },
    tags: ["element:plant", "Calm"],
    publishedAt: "2026-02-22T09:00:00.000Z",
    readingMinutes: 7,
    imageSeed: "hemp",
    body: `In Kavre, the hemp grows by the road. Most of it is wild. Some of it is farmed by a family we've been buying from for three years.\n\nThe oil we sell comes from this farm. The video below is from one morning in October when the cut had just started.`,
  },
  {
    slug: "spring-water-ritual",
    title: "Spring Water Ritual",
    excerpt:
      "Why we ship water across the country in glass, and what we lose when we don't.",
    category: { slug: "wellness", name: "Wellness" },
    tags: ["element:water", "Purity"],
    publishedAt: "2026-02-08T09:00:00.000Z",
    readingMinutes: 4,
    imageSeed: "spring",
    body: `Water in plastic gets a faint plastic taste within forty-eight hours. Water in glass tastes like water for as long as you keep it.\n\nThis is the entire reason we ship in glass. There is no other reason. We don't need one.`,
  },
  {
    slug: "smoke-and-intention",
    title: "Smoke and Intention",
    excerpt:
      "A short essay on why we still light incense in 2026, and what the smoke is actually doing.",
    category: { slug: "ritual", name: "Ritual" },
    tags: ["element:air", "Ritual", "product:canned-himalayan-oxygen"],
    publishedAt: "2026-01-25T09:00:00.000Z",
    readingMinutes: 3,
    imageSeed: "smoke",
    body: `Smoke moves through a room. It does not change the room. It changes the way you sit in the room.\n\nThat is the whole point. We don't claim much beyond it.`,
  },
];

export const mockPosts: BlogPostDetail[] = seeds.map((s, i) => ({
  id: `post-${s.slug}`,
  slug: s.slug,
  title: s.title,
  excerpt: s.excerpt,
  heroImageUrl: img(s.imageSeed),
  authorName: "Editorial",
  category: s.category,
  tags: s.tags,
  publishedAt: s.publishedAt,
  readingMinutes: s.readingMinutes,
  bodyMarkdown: s.body,
  seoTitle: `${s.title} — Shaman Kathmandu`,
  seoDescription: s.excerpt,
}));

export const mockBlogCategories: BlogCategory[] = [
  { slug: "shaman-stories", name: "Shaman Stories", description: null, postCount: 1 },
  { slug: "sound-healing", name: "Sound Healing", description: null, postCount: 1 },
  { slug: "documentary", name: "Documentary", description: null, postCount: 2 },
  { slug: "meditation", name: "Meditation", description: null, postCount: 1 },
  { slug: "wellness", name: "Wellness", description: null, postCount: 1 },
  { slug: "ritual", name: "Ritual", description: null, postCount: 1 },
];

export function findPostBySlug(slug: string): BlogPostDetail | undefined {
  return mockPosts.find((p) => p.slug === slug);
}
