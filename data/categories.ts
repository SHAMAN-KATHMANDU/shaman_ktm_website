import type { Category } from "@/types/product";

const img = (seed: string) => `https://picsum.photos/seed/${seed}/900/1100`;

export const categories: Category[] = [
  {
    slug: "jewelry",
    name: { en: "Jewelry", np: "गहना" },
    image: img("shamanktm-cat-jewelry"),
    alt: "Handcrafted Nepali jewelry",
  },
  {
    slug: "spiritual",
    name: { en: "Spiritual", np: "आध्यात्मिक" },
    image: img("shamanktm-cat-spiritual"),
    alt: "Tibetan singing bowls and spiritual items",
  },
  {
    slug: "statues",
    name: { en: "Statues", np: "मूर्ति" },
    image: img("shamanktm-cat-statues"),
    alt: "Carved wooden statues and deities",
  },
  {
    slug: "home-decor",
    name: { en: "Home Decor", np: "घर सजावट" },
    image: img("shamanktm-cat-decor"),
    alt: "Boho home decor pieces",
  },
  {
    slug: "furniture",
    name: { en: "Furniture", np: "फर्निचर" },
    image: img("shamanktm-cat-furniture"),
    alt: "Rattan and bamboo furniture",
  },
  {
    slug: "gifts",
    name: { en: "Gifts", np: "उपहार" },
    image: img("shamanktm-cat-gifts"),
    alt: "Handcrafted gifts from Nepal",
  },
];
