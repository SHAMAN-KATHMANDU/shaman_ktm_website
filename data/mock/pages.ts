import type { PageDetail } from "@/lib/api/types";

export const mockPages: PageDetail[] = [
  {
    slug: "about",
    title: "About",
    publishedAt: "2026-01-01T00:00:00.000Z",
    bodyMarkdown: `Shaman Kathmandu is a small showroom group in Kathmandu and Lalitpur. We curate objects and services around six elements — Metal, Earth, Wood, Plant, Water, Air.\n\nWe source where we can; we make where we can't. We try to keep the chain short and the prices honest.\n\nFour locations: Thamel, Jhamsikhel, Gongabu, and Gatthaghar (Bhaktapur). WhatsApp the showroom that's closest — most enquiries are answered the same day.`,
    seoTitle: "About — Shaman Kathmandu",
    seoDescription:
      "Curated in Kathmandu. From the world. For the world. Four showrooms across the valley.",
  },
  {
    slug: "faq",
    title: "FAQ",
    publishedAt: "2026-01-01T00:00:00.000Z",
    bodyMarkdown: `## Do you ship outside Nepal?\n\nYes — by request, on a per-order basis. WhatsApp us first to confirm the destination and quote.\n\n## How is the singing bowl tuned?\n\nEach bowl is hand-tuned by ear in Patan. Notes are approximate. We list a primary tone where we can hear one cleanly.\n\n## What's the member threshold?\n\nNPR 1,500 lifetime spend. After that, member pricing applies automatically at checkout.\n\n## Returns?\n\nWithin 14 days, in original condition. Email or WhatsApp first.`,
    seoTitle: "FAQ — Shaman Kathmandu",
    seoDescription: "Common questions about products, shipping, and membership.",
  },
];
