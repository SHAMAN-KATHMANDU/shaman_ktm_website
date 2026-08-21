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

// Keep sharp/libvips from ballooning memory on a small instance: one worker
// thread per operation and no decoded-image cache. Combined with the low
// IMAGE_CONCURRENCY below, this bounds how much image data is resident at once
// (an unbounded export once wedged the box with OOM).
sharp.concurrency(1);
sharp.cache(false);

export type ProductForExport = Prisma.ProductGetPayload<{
  include: { images: true; category: true };
}>;

const IMG_PX = 96; // embedded image display box, in pixels
const THUMB_PX = 220; // downscale longest edge before embedding
// How many images to fetch+decode at once. Kept deliberately low: each in-flight
// image holds its full-resolution bytes plus libvips' decode buffers in memory,
// so a high value can OOM a small instance. Overridable via env for bigger boxes.
const IMAGE_CONCURRENCY = (() => {
  const raw = Number(process.env.PRODUCT_EXPORT_IMAGE_CONCURRENCY);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 16) : 4;
})();
const PER_IMAGE_TIMEOUT_MS = 6000; // abort a single slow image after this
const MAX_INPUT_PIXELS = 40_000_000; // reject absurdly large source images (~40MP)

// The proxy budget this route actually gets in production.
//
// The previous value here was derived from a 120s `location = /api/sysuser/
// products/export` block in deploy/prod/nginx.conf. THAT BLOCK HAS NEVER BEEN
// LIVE: production loads /etc/nginx/sites-enabled/shamanktmweb.conf, a regular
// file that has no such location, so the export is served by `location /` at
// proxy_read_timeout 30s. Verify before changing this number:
//
//     ssh shaman_web "sudo nginx -T" | grep -n proxy_read_timeout
//
// The response is buffered — nginx sees nothing from upstream until the whole
// .xlsx is built — so this is a hard wall on total handler time, not on idle
// time between chunks.
const PROXY_BUDGET_MS = 30_000;

// Everything that is NOT the image phase still has to fit inside the budget:
// the findMany over every product with its images and category, exceljs
// building the workbook, serialising it (~1.8 MB on the current catalogue) and
// writing it back. Reserved generously — being early costs some thumbnails,
// being late costs the entire export.
const NON_IMAGE_RESERVE_MS = 10_000;

/**
 * Wall-clock cap for the image phase.
 *
 * The invariant that matters: this MUST be under the proxy budget. The whole
 * point of the cap is to degrade — ship the remaining rows without photos —
 * and a cap above the proxy's timeout can never fire, because nginx kills the
 * connection first and the admin gets a 504 instead of a slightly thinner
 * spreadsheet. Exported and pure so that invariant is testable rather than a
 * comment somebody has to notice.
 */
export function defaultDeadlineMs(
  proxyBudgetMs: number = PROXY_BUDGET_MS,
  reserveMs: number = NON_IMAGE_RESERVE_MS,
): number {
  return Math.max(1_000, proxyBudgetMs - reserveMs);
}

export const EXPORT_PROXY_BUDGET_MS = PROXY_BUDGET_MS;

// Overridable via env — but note the override is NOT passed through
// docker-compose, so on production the default above is the operative value.
const DEADLINE_MS = (() => {
  const raw = Number(process.env.PRODUCT_EXPORT_DEADLINE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultDeadlineMs();
})();

/**
 * Message for an export that ran out of time before embedding every photo.
 *
 * Returns null when nothing was dropped. A truncated export must never read as
 * a complete one — the rows are all present and the image URLs are all listed,
 * so a missing thumbnail is invisible unless we say so.
 */
export function truncationWarning(
  total: number,
  embedded: number,
): string | null {
  if (embedded >= total) return null;
  return `[product-export] deadline reached: embedded ${embedded} of ${total} product photos. The remaining ${total - embedded} rows are complete but have no image (their URLs are still in the "All image URLs" column). Raise PRODUCT_EXPORT_DEADLINE_MS only if the proxy budget for this route is raised first.`;
}

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
    return await sharp(input, { failOn: "none", limitInputPixels: MAX_INPUT_PIXELS })
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
  let attempted = 0;
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
    attempted += slice.length;
  }
  // The cap used to fire in silence, which is the same defect in miniature:
  // the spreadsheet arrives looking complete.
  const warning = truncationWarning(products.length, attempted);
  if (warning) console.warn(warning);
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
  opts: { photos?: boolean } = {},
): Promise<ExcelJS.Workbook> {
  // Photos are the entire cost of the export — fetching + downscaling each
  // image dominates the wall time. Skipping them makes even a 1000+ product
  // catalog export in well under a second, so the UI offers it as a toggle.
  const withPhotos = opts.photos !== false;
  const thumbs = withPhotos
    ? await fetchAllThumbnails(products)
    : new Array<Buffer | null>(products.length).fill(null);

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
