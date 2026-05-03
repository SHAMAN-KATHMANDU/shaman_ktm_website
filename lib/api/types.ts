// ============================================================
// Mirrors the Public Data API response shapes verbatim.
// See: /Users/roshanpandey/PROJECTS/shaman/projectX/docs/PUBLIC-DATA-API.md
// ============================================================

// === API: /site ===
export interface SiteConfig {
  name: string;
  tagline: string;
  branding: {
    logoUrl: string;
    colors: { primary: string; secondary: string; accent: string };
  };
  themeTokens: {
    mode: "light" | "dark";
    typography: { fontFamily: string; baseFontSize: number };
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    socials: Record<string, string>;
  };
  seo: { title: string; description: string; ogImage: string };
  currency: string;
  locales: string[];
  defaultLocale: string;
}

// === API: /products ===
export interface ProductVariation {
  id: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  thumbnailUrl: string;
  categoryId: string;
  vendorId: string | null;
  variations: ProductVariation[];
  createdAt: string;
  tags?: string[];
  /** When true, public surfaces hide the price and show "Price on enquiry". */
  priceOnEnquiry?: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string; // markdown
  images: string[];
  category: { id: string; name: string; slug?: string };
  tags: string[];
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "relevance";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  /** Frontend convenience — resolved to categoryId before live request. */
  categorySlug?: string;
  search?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  vendorId?: string;
  attr?: string;
  includeFacets?: boolean;
}

export interface ProductListResponse {
  products: ProductSummary[];
  total: number;
  page: number;
  limit: number;
  facets: Record<string, unknown> | null;
}

// === API: /products/:id/reviews ===
export interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}

// === API: /products/:id/frequently-bought-with ===
export interface FrequentlyBoughtItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  price: number;
  coPurchaseCount: number;
}

// === API: /categories ===
export interface Category {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  imageUrl: string | null;
}

// === API: /collections/:slug ===
export interface Collection {
  slug: string;
  title: string;
  subtitle: string | null;
  products: ProductSummary[];
}

// === API: /bundles ===
export interface BundleItem {
  productId: string;
  name: string;
  quantity: number;
  thumbnailUrl: string;
}

export interface BundleSummary {
  id: string;
  slug: string;
  title: string;
  price: number;
  items: BundleItem[];
}

export interface BundleDetail extends BundleSummary {
  description: string;
  compareAtPrice?: number;
}

// === API: /blog ===
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  heroImageUrl: string;
  /** YouTube/Vimeo embed URL — when present, replaces the hero image with an iframe. */
  heroVideoEmbedUrl?: string;
  authorName: string;
  category: { slug: string; name: string };
  tags: string[];
  publishedAt: string;
  readingMinutes: number;
}

export interface BlogPostDetail extends BlogPostSummary {
  bodyMarkdown: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogPostListResponse {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface BlogPostDetailResponse {
  post: BlogPostDetail;
  related: BlogPostSummary[];
}

export interface BlogCategory {
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
}

export interface ListBlogPostsParams {
  page?: number;
  limit?: number;
  categorySlug?: string;
  tag?: string;
  q?: string;
}

// === API: /pages ===
export interface PageSummary {
  slug: string;
  title: string;
  publishedAt: string;
}

export interface PageDetail extends PageSummary {
  bodyMarkdown: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

// ============================================================
// Frontend display layer (not API)
// ============================================================

export type ElementSlug =
  | "metal"
  | "earth"
  | "wood"
  | "plant"
  | "water"
  | "air";

export interface ElementMeta {
  slug: ElementSlug;
  name: string;
  /** Glyph for badges. Demo uses ◈ ▣ ❖ ✿ ≋ ❋. */
  icon: string;
  /** Hex accent color. */
  accent: string;
  natureSource: string;
  energyDescription: string;
}

export interface Service {
  slug: string;
  name: string;
  element: ElementSlug;
  duration: string;
  pricePerSession: number;
  hero: string;
  summary: string;
  whatToExpect: string[];
  relatedProductSlugs: string[];
}

export interface Showroom {
  key: string;
  name: string;
  address: string;
  /** E.164 without leading +. */
  whatsapp: string;
  mapEmbedUrl: string;
}

// ============================================================
// Local-only (localStorage) — not API, not from CMS
// ============================================================

export interface CartItem {
  productId: string;
  productSlug: string;
  variationId?: string;
  quantity: number;
  priceAtAdd: number;
  nameAtAdd: string;
  thumbnailAtAdd: string;
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}

export type DeliveryZone = "thamel" | "jhamsikhel" | "gongabu" | "shipping";
export type PaymentMethod = "esewa" | "khalti" | "cod" | "bank";

export interface Order {
  number: string;
  items: CartItem[];
  subtotal: number;
  memberDiscount: number;
  total: number;
  delivery: {
    name: string;
    phone: string;
    address: string;
    zone: DeliveryZone;
    notes?: string;
  };
  payment: { method: PaymentMethod; status: "pending" };
  createdAt: string;
}

export interface User {
  email: string;
  name: string;
  phone?: string;
  memberStatus: "guest" | "member";
}
