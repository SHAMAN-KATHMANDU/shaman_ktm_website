import type { BlogCategory, BlogPostDetail } from "@/lib/api/types";

interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string };
  tags: string[];
  publishedAt: string;
  readingMinutes: number;
  body: string;
  /** Public-folder path. Defaults to the brand stories banner. */
  heroImage?: string;
  heroVideoEmbedUrl?: string;
}

const DEFAULT_HERO = "/stories-banner.jpeg";

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
    heroVideoEmbedUrl: "https://www.youtube.com/embed/hG-fY8LdHBw",
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
];

export const mockPosts: BlogPostDetail[] = seeds.map((s) => ({
  id: `post-${s.slug}`,
  slug: s.slug,
  title: s.title,
  excerpt: s.excerpt,
  heroImageUrl: s.heroImage ?? DEFAULT_HERO,
  heroVideoEmbedUrl: s.heroVideoEmbedUrl,
  authorName: "Shaman Kathmandu",
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
];

export function findPostBySlug(slug: string): BlogPostDetail | undefined {
  return mockPosts.find((p) => p.slug === slug);
}
