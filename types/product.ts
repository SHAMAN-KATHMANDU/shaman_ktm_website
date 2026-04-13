export type LocalizedString = { en: string; np: string };

export type CategorySlug =
  | "jewelry"
  | "spiritual"
  | "statues"
  | "home-decor"
  | "furniture"
  | "gifts";

export type Category = {
  slug: CategorySlug;
  name: LocalizedString;
  image: string;
  alt: string;
};

export type ProductBadge =
  | { kind: "off"; percent: number }
  | { kind: "new" };

export type Product = {
  slug: string;
  name: string;
  category: CategorySlug;
  categoryLabel: string;
  price: number;
  wasPrice?: number;
  image: string;
  alt: string;
  description: string;
  badge?: ProductBadge;
  featured?: boolean;
};

export type Showroom = {
  key: "thamel" | "jhamsikhel" | "gongabu";
  name: string;
  address: string;
  mapUrl: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  tag: string;
  image: string;
  alt: string;
};

export type Influencer = {
  name: string;
  handle: string;
  followers: string;
  niche: string;
  image: string;
};
