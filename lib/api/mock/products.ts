import {
  findProductBySlug,
  findProductById,
  mockProducts,
  mockProductSummaries,
  toSummary,
} from "@/data/mock/products";
import { mockCategories } from "@/data/mock/categories";
import type {
  FrequentlyBoughtItem,
  ListProductsParams,
  ProductDetail,
  ProductListResponse,
  ProductSummary,
  Review,
  ReviewListResponse,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listProducts(
  params: ListProductsParams = {},
  locale: Locale = "en",
): Promise<ProductListResponse> {
  const {
    page = 1,
    limit = 24,
    categoryId,
    categorySlug,
    elementSlug,
    search,
    sort = "newest",
    minPrice,
    maxPrice,
    attr,
  } = params;

  let items: ProductSummary[] = mockProductSummaries.slice();

  const resolvedCategoryId =
    categoryId ??
    (categorySlug
      ? mockCategories.find((c) => c.slug === categorySlug)?.id
      : undefined);

  if (resolvedCategoryId) {
    items = items.filter((p) => p.categoryId === resolvedCategoryId);
  }
  if (elementSlug) {
    items = items.filter((p) => (p.elementSlugs ?? []).includes(elementSlug));
  }
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }
  if (minPrice !== undefined) items = items.filter((p) => p.price >= minPrice);
  if (maxPrice !== undefined) items = items.filter((p) => p.price <= maxPrice);
  if (attr) {
    const [key, value] = attr.split(":");
    if (key && value) {
      items = items.filter((p) =>
        (p.tags ?? []).some((t) => t.toLowerCase() === value.toLowerCase()),
      );
    }
  }

  switch (sort) {
    case "price_asc":
      items.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      items.sort((a, b) => b.price - a.price);
      break;
    case "newest":
    case "relevance":
    default:
      items.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      break;
  }

  const total = items.length;
  const start = (page - 1) * limit;
  const products = items.slice(start, start + limit);

  return { products, total, page, limit, facets: null };
}

export async function getProduct(idOrSlug: string, locale: Locale = "en"): Promise<ProductDetail> {
  const found =
    findProductBySlug(idOrSlug) ?? findProductById(idOrSlug);
  if (!found) throw new Error(`Product not found: ${idOrSlug}`);
  return found;
}

export async function getProductReviews(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {},
  locale: Locale = "en",
): Promise<ReviewListResponse> {
  const { page = 1, limit = 10 } = params;
  const product = findProductBySlug(idOrSlug) ?? findProductById(idOrSlug);
  if (!product) throw new Error(`Product not found: ${idOrSlug}`);
  // Generate a tiny deterministic set of demo reviews per product.
  const reviews: Review[] = [
    {
      id: `${product.id}-r1`,
      rating: 5,
      title: "Exactly as described",
      body: "Arrived well-packed. Quality is what I'd hoped for at this price.",
      authorName: "Anjali",
      createdAt: "2026-04-18T10:14:00.000Z",
    },
    {
      id: `${product.id}-r2`,
      rating: 5,
      title: "Worth the visit",
      body: "Picked it up at the Thamel showroom — staff were patient and let me try a few before choosing.",
      authorName: "Marcus",
      createdAt: "2026-04-02T15:30:00.000Z",
    },
    {
      id: `${product.id}-r3`,
      rating: 4,
      title: "Lovely",
      body: "Beautiful piece. Took a couple of days to get used to.",
      authorName: "Priya",
      createdAt: "2026-03-21T08:45:00.000Z",
    },
  ];
  const total = reviews.length;
  const start = (page - 1) * limit;
  return { reviews: reviews.slice(start, start + limit), total, page, limit };
}

export async function getFrequentlyBoughtWith(
  idOrSlug: string,
  locale: Locale = "en",
): Promise<FrequentlyBoughtItem[]> {
  const product = findProductBySlug(idOrSlug) ?? findProductById(idOrSlug);
  if (!product) return [];
  // Same category, excluding self.
  const sameCat = mockProducts
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);
  return sameCat.map((p, i) => ({
    id: p.id,
    name: p.name,
    thumbnailUrl: p.thumbnailUrl,
    price: p.price,
    coPurchaseCount: 12 - i * 2,
  }));
}

export async function listOffers(
  params: ListProductsParams = {},
  locale: Locale = "en",
): Promise<ProductListResponse> {
  // Offers = products with compareAtPrice set.
  const baseList = await listProducts(params, locale);
  const offers = baseList.products.filter((p) => {
    const detail = mockProducts.find((d) => d.id === p.id);
    return !!detail?.compareAtPrice;
  });
  return { ...baseList, products: offers, total: offers.length };
}

export { toSummary };
