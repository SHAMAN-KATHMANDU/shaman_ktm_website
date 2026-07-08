// Builds an .xlsx workbook of the product catalog with each product's primary
// photo embedded inline in the first column. Used by the admin export endpoint
// (app/api/sysuser/products/export/route.ts).
//
// Images are stored either as absolute S3 URLs or legacy site-relative paths
// (see lib/image.ts). We normalise to an absolute URL, fetch the bytes, and
// downscale them with sharp before embedding. Downscaling is what keeps the
// endpoint fast enough to beat the 30s nginx proxy timeout AND keeps the .xlsx
// small enough to stream back quickly — full-resolution product photos would
// blow past both.
//
// Robustness: every image fetch has its own timeout, fetches run with bounded
// concurrency, and the whole image phase is capped by a wall-clock deadline.
// Once the deadline passes, remaining products still export — just without an
// embedded photo (their URLs are always listed in the "All image URLs" column),
// so a big catalog degrades gracefully instead of 504-ing.

import ExcelJS from "exceljs";
import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { absoluteUrl } from "@/lib/image";

export type ProductForExport = Prisma.ProductGetPayload<{
  include: { images: true; category: true };
}>;

const IMG_PX = 96; // embedded image display box, in pixels
const THUMB_PX = 220; // downscale longest edge before embedding
const IMAGE_CONCURRENCY = 16; // parallel fetches per batch
const PER_IMAGE_TIMEOUT_MS = 6000; // abort a single slow image after this

// Hard cap on the whole image-fetch phase. Must stay comfortably under the
// nginx proxy_read_timeout (30s in deploy/prod/nginx.conf) so the route always
// responds. Overridable via env once the proxy timeout is raised.
const DEADLINE_MS = (() => {
  const raw = Number(process.env.PRODUCT_EXPORT_DEADLINE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 24_000;
})();

// Fetch a product's primary image and downscale it to a small JPEG. Never
// throws — on any failure (network, timeout, unsupported/corrupt image) it
// resolves to null so one bad photo can't fail the whole export.
async function fetchThumbnail(
  product: ProductForExport,
  budgetMs: number,
): Promise<Buffer | null> {
  const raw = product.thumbnailUrl ?? product.images[0]?.url ?? null;
  const url = absoluteUrl(raw);
  if (!url) return null;
  const timeout = Math.min(PER_IMAGE_TIMEOUT_MS, Math.max(500, budgetMs));
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length === 0) return null;
    // sharp reads png/jpeg/gif/webp/avif/svg and re-encodes to JPEG. Transparent
    // backgrounds are flattened to white so they sit cleanly on the sheet.
    return await sharp(input, { failOn: "none" })
      .rotate() // honour EXIF orientation
      .resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 72 })
      .toBuffer();
  } catch {
    return null;
  }
}

// Resolve every product's thumbnail in bounded-concurrency batches, stopping
// once the wall-clock deadline is hit (remaining entries stay null).
async function fetchAllThumbnails(
  products: ProductForExport[],
): Promise<Array<Buffer | null>> {
  const out: Array<Buffer | null> = new Array(products.length).fill(null);
  const deadline = Date.now() + DEADLINE_MS;
  for (let i = 0; i < products.length; i += IMAGE_CONCURRENCY) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break; // out of time — leave the rest without a photo
    const slice = products.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.all(
      slice.map((p) => fetchThumbnail(p, remaining)),
    );
    results.forEach((r, j) => {
      out[i + j] = r;
    });
  }
  return out;
}

interface Dimensions {
  length?: number;
  width?: number;
  height?: number;
  diameter?: number;
  weight?: number;
  unit?: string;
  weightUnit?: string;
  note?: string;
}

// Render the dimensions JSON into a short human string, e.g. "12×8×8 cm · 300 g".
function summarizeDimensions(value: Prisma.JsonValue | null): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const d = value as Dimensions;
  const unit = d.unit || "cm";
  const parts: string[] = [];
  if (d.length != null && d.width != null && d.height != null) {
    parts.push(`${d.length}×${d.width}×${d.height} ${unit}`);
  } else {
    const each: string[] = [];
    if (d.length != null) each.push(`L ${d.length}`);
    if (d.width != null) each.push(`W ${d.width}`);
    if (d.height != null) each.push(`H ${d.height}`);
    if (each.length) parts.push(`${each.join(" · ")} ${unit}`);
  }
  if (d.diameter != null) parts.push(`⌀ ${d.diameter} ${unit}`);
  if (d.weight != null) parts.push(`${d.weight} ${d.weightUnit || "g"}`);
  if (d.note) parts.push(d.note);
  return parts.join(" · ");
}

const COLUMNS: Array<{ header: string; key: string; width: number }> = [
  { header: "Image", key: "image", width: 15 },
  { header: "Name", key: "name", width: 28 },
  { header: "Name (NE)", key: "nameNe", width: 22 },
  { header: "Slug", key: "slug", width: 24 },
  { header: "SKU", key: "sku", width: 16 },
  { header: "Price (NPR)", key: "price", width: 14 },
  { header: "Compare-at", key: "compareAtPrice", width: 14 },
  { header: "Stock", key: "stock", width: 10 },
  { header: "Status", key: "status", width: 12 },
  { header: "Category", key: "category", width: 18 },
  { header: "Elements", key: "elements", width: 20 },
  { header: "Tags", key: "tags", width: 24 },
  { header: "Dimensions", key: "dimensions", width: 24 },
  { header: "Flags", key: "flags", width: 18 },
  { header: "Description", key: "description", width: 50 },
  { header: "All image URLs", key: "imageUrls", width: 40 },
  { header: "Updated", key: "updated", width: 22 },
];

export async function buildProductsWorkbook(
  products: ProductForExport[],
): Promise<ExcelJS.Workbook> {
  const thumbs = await fetchAllThumbnails(products);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shaman Kathmandu";
  const ws = workbook.addWorksheet("Products");

  ws.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Bold, frozen header row.
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  products.forEach((p, i) => {
    const flags = [
      p.isFeatured ? "Featured" : null,
      p.isNewRelease ? "New" : null,
      p.priceOnEnquiry ? "Enquiry" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const row = ws.addRow({
      image: "",
      name: p.name,
      nameNe: p.nameNe ?? "",
      slug: p.slug,
      sku: p.sku ?? "",
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? "",
      stock: p.stockQuantity ?? "untracked",
      status: p.status,
      category: p.category?.name ?? "",
      elements: p.elementSlugs.join(", "),
      tags: p.tags.join(", "),
      dimensions: summarizeDimensions(p.dimensions),
      flags,
      description: p.description ?? "",
      imageUrls: p.images.map((img) => img.url).join("\n"),
      updated: p.updatedAt.toISOString().slice(0, 10),
    });
    row.alignment = { vertical: "middle", wrapText: true };

    const thumb = thumbs[i];
    if (thumb) {
      const imageId = workbook.addImage({
        buffer: thumb as unknown as ExcelJS.Buffer,
        extension: "jpeg",
      });
      // Anchor row is 0-indexed (row 0 === Excel row 1 === header), so the
      // freshly added data row lives at index `row.number - 1`.
      ws.addImage(imageId, {
        tl: { col: 0, row: row.number - 1 },
        ext: { width: IMG_PX, height: IMG_PX },
        editAs: "oneCell",
      });
      row.height = 74; // ~96px so the image fits inside the cell
    }
  });

  return workbook;
}
