// Meta / Google product feed (RSS 2.0 with the g: namespace). Meta Commerce
// Manager ingests this on a schedule to build the Catalog whose photos back
// dynamic ads and the product view in Events Manager.
//
// Variations become an item group: one <item> per variation (id = variation
// id, linked by <g:item_group_id> = slug), each with its own price, stock and
// image. Products with no variation are a single item keyed by the slug. The
// <g:id> here MUST equal the pixel `content_ids` — see lib/catalog-id.ts.
// Enquiry-only and imageless products are skipped (Meta requires a price and
// an image).

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { absoluteUrl } from "@/lib/image";
import { catalogItemId } from "@/lib/catalog-id";
import { formatMetaPrice } from "@/lib/meta-format";

const BRAND = "Shaman Kathmandu";
const MAX_ADDITIONAL_IMAGES = 10;
// Variation attribute keys we can express as native Meta variant fields.
const VARIANT_ATTR_FIELDS = ["color", "size", "material", "pattern"] as const;

function xmlEscape(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[
        c
      ] as string,
  );
}

/** Strip markdown to plain text for the feed description. */
function toPlainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → link text
    .replace(/[#>*_`~]/g, "") // markdown punctuation
    .replace(/\r?\n+/g, " ") // newlines → space
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function tag(name: string, value: string): string {
  return `<${name}>${xmlEscape(value)}</${name}>`;
}

function isImageValue(v: string): boolean {
  return /^https?:\/\//i.test(v) || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(v);
}

/** Split a variation's attributes into an image (if any) and text options. */
function readAttributes(attributes: unknown): {
  image: string | null;
  text: { key: string; value: string }[];
} {
  const image: { url: string | null } = { url: null };
  const text: { key: string; value: string }[] = [];
  if (attributes && typeof attributes === "object") {
    for (const [key, raw] of Object.entries(
      attributes as Record<string, unknown>,
    )) {
      if (typeof raw !== "string" || !raw) continue;
      if (isImageValue(raw)) {
        if (!image.url) image.url = raw;
      } else {
        text.push({ key, value: raw });
      }
    }
  }
  return { image: image.url, text };
}

interface FeedItem {
  id: string;
  itemGroupId?: string;
  title: string;
  price: number;
  inStock: boolean;
  image: string;
  additionalImages: string[];
  variantFields: string; // pre-rendered <g:color> etc.
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "published", noindex: false, priceOnEnquiry: false },
    select: {
      slug: true,
      name: true,
      description: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      stockQuantity: true,
      dimensions: true,
      thumbnailUrl: true,
      images: { orderBy: { position: "asc" }, select: { url: true } },
      variations: {
        select: { id: true, price: true, stock: true, attributes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items: string[] = [];
  for (const p of products) {
    const productImage = absoluteUrl(p.thumbnailUrl ?? p.images[0]?.url ?? null);
    const productImages = p.images
      .map((i) => absoluteUrl(i.url))
      .filter((u): u is string => !!u);

    const currency = p.currency || "NPR";
    const description = toPlainText(p.description) || p.name;
    const link = `${siteUrl}/products/${p.slug}`;
    const hasVariants = p.variations.length > 1;

    // Product-level physical dimensions → Google shipping/size fields (shared
    // across every feed item of this product). Google requires length, width
    // and height together, and only accepts cm/in and g/kg/lb/oz units.
    const dim = (p.dimensions ?? null) as {
      length?: number | null;
      width?: number | null;
      height?: number | null;
      weight?: number | null;
      unit?: "cm" | "in";
      weightUnit?: "g" | "kg";
    } | null;
    const dimFields = dim
      ? [
          dim.weight != null
            ? tag("g:shipping_weight", `${dim.weight} ${dim.weightUnit ?? "g"}`)
            : "",
          dim.length != null && dim.width != null && dim.height != null
            ? tag("g:product_length", `${dim.length} ${dim.unit ?? "cm"}`) +
              tag("g:product_width", `${dim.width} ${dim.unit ?? "cm"}`) +
              tag("g:product_height", `${dim.height} ${dim.unit ?? "cm"}`)
            : "",
        ].join("")
      : "";

    const feedItems: FeedItem[] = [];
    if (p.variations.length === 0) {
      if (!productImage) continue; // Meta requires an image_link.
      feedItems.push({
        id: catalogItemId(p.slug, null),
        title: p.name,
        price: p.price,
        // No variations → product-level stock (null = untracked → available).
        inStock: p.stockQuantity == null || p.stockQuantity > 0,
        image: productImage,
        additionalImages: productImages.filter((u) => u !== productImage),
        variantFields: "",
      });
    } else {
      for (const v of p.variations) {
        const { image: variantImage, text } = readAttributes(v.attributes);
        const image = absoluteUrl(variantImage) ?? productImage;
        if (!image) continue; // skip variations we can't illustrate
        const descriptor = text.map((t) => t.value).join(" / ");
        const variantFields = text
          .filter((t) =>
            (VARIANT_ATTR_FIELDS as readonly string[]).includes(
              t.key.toLowerCase(),
            ),
          )
          .map((t) => tag(`g:${t.key.toLowerCase()}`, t.value))
          .join("");
        feedItems.push({
          id: catalogItemId(p.slug, v.id),
          itemGroupId: hasVariants ? p.slug : undefined,
          title: descriptor ? `${p.name} — ${descriptor}` : p.name,
          price: v.price,
          inStock: v.stock > 0,
          image,
          additionalImages: productImages.filter((u) => u !== image),
          variantFields,
        });
      }
    }

    for (const it of feedItems) {
      const onSale = p.compareAtPrice != null && p.compareAtPrice > it.price;
      const price = `${formatMetaPrice(it.price)} ${currency}`;
      const fields = [
        tag("g:id", it.id),
        it.itemGroupId ? tag("g:item_group_id", it.itemGroupId) : "",
        tag("g:title", it.title),
        tag("g:description", description),
        tag("g:link", link),
        tag("g:image_link", it.image),
        ...it.additionalImages
          .slice(0, MAX_ADDITIONAL_IMAGES)
          .map((u) => tag("g:additional_image_link", u)),
        tag("g:availability", it.inStock ? "in stock" : "out of stock"),
        tag("g:condition", "new"),
        tag(
          "g:price",
          onSale ? `${formatMetaPrice(p.compareAtPrice!)} ${currency}` : price,
        ),
        ...(onSale ? [tag("g:sale_price", price)] : []),
        dimFields,
        it.variantFields,
        tag("g:brand", BRAND),
        tag("g:identifier_exists", "no"),
      ].join("");
      items.push(`<item>${fields}</item>`);
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">` +
    `<channel>` +
    tag("title", `${BRAND} — Products`) +
    `<link>${xmlEscape(siteUrl)}</link>` +
    tag("description", "Shaman Kathmandu product catalog") +
    items.join("") +
    `</channel></rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
