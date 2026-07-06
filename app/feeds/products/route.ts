// Meta / Google product feed (RSS 2.0 with the g: namespace). Meta Commerce
// Manager ingests this on a schedule to build the Catalog whose photos back
// dynamic ads and the product view in Events Manager.
//
// The <g:id> here MUST equal the pixel `content_ids` (the product slug) and
// the og:product:retailer_item_id, so Meta can match a viewed/purchased
// product to its catalog photo. Enquiry-only and imageless products are
// skipped (Meta requires a price and an image).

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { absoluteUrl } from "@/lib/image";

const BRAND = "Shaman Kathmandu";
const MAX_ADDITIONAL_IMAGES = 10;

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
      thumbnailUrl: true,
      images: { orderBy: { position: "asc" }, select: { url: true } },
      variations: { select: { stock: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const items: string[] = [];
  for (const p of products) {
    const image = absoluteUrl(p.thumbnailUrl ?? p.images[0]?.url ?? null);
    if (!image) continue; // Meta requires an image_link.

    const currency = p.currency || "NPR";
    const price = `${p.price}.00 ${currency}`;
    const onSale = p.compareAtPrice != null && p.compareAtPrice > p.price;

    // Availability: in stock unless every tracked variation is at zero.
    const inStock =
      p.variations.length === 0 ||
      p.variations.reduce((sum, v) => sum + v.stock, 0) > 0;

    const additional = p.images
      .map((i) => absoluteUrl(i.url))
      .filter((u): u is string => !!u && u !== image)
      .slice(0, MAX_ADDITIONAL_IMAGES);

    const fields = [
      tag("g:id", p.slug),
      tag("g:title", p.name),
      tag("g:description", toPlainText(p.description) || p.name),
      tag("g:link", `${siteUrl}/products/${p.slug}`),
      tag("g:image_link", image),
      ...additional.map((u) => tag("g:additional_image_link", u)),
      tag("g:availability", inStock ? "in stock" : "out of stock"),
      tag("g:condition", "new"),
      tag("g:price", onSale ? `${p.compareAtPrice}.00 ${currency}` : price),
      ...(onSale ? [tag("g:sale_price", price)] : []),
      tag("g:brand", BRAND),
      tag("g:identifier_exists", "no"),
    ].join("");

    items.push(`<item>${fields}</item>`);
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
