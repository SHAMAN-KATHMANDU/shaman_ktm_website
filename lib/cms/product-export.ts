// Builds an .xlsx workbook of the product catalog with each product's primary
// photo embedded inline in the first column. Used by the admin export endpoint
// (app/api/sysuser/products/export/route.ts).
//
// Images are stored either as absolute S3 URLs or legacy site-relative paths
// (see lib/image.ts). We normalise to an absolute URL, fetch the bytes, and
// embed them. ExcelJS only supports raster images (png/jpeg/gif); anything else
// (svg/webp) is skipped — the cell is left blank but the URL still appears in
// the "All image URLs" column so nothing is lost.

import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { absoluteUrl } from "@/lib/image";

export type ProductForExport = Prisma.ProductGetPayload<{
  include: { images: true; category: true };
}>;

type ExcelImageExtension = "png" | "jpeg" | "gif";

const IMG_PX = 96; // embedded image box, in pixels
const IMAGE_CONCURRENCY = 8; // parallel fetches per batch

interface FetchedImage {
  buffer: Buffer;
  extension: ExcelImageExtension;
}

// Map a content-type / URL suffix to one of the three extensions ExcelJS
// accepts. Returns null for unsupported types so the caller can skip embedding.
function resolveExtension(
  contentType: string | null,
  url: string,
): ExcelImageExtension | null {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpeg";
  if (ct.includes("gif")) return "gif";
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  if (lower.endsWith(".gif")) return "gif";
  return null;
}

// Fetch a single product's primary image bytes. Never throws — on any failure
// (network error, non-2xx, unsupported type) it resolves to null so one broken
// photo can't fail the whole export.
async function fetchPrimaryImage(
  product: ProductForExport,
): Promise<FetchedImage | null> {
  const raw = product.thumbnailUrl ?? product.images[0]?.url ?? null;
  const url = absoluteUrl(raw);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const extension = resolveExtension(res.headers.get("content-type"), url);
    if (!extension) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    return { buffer, extension };
  } catch {
    return null;
  }
}

// Resolve every product's primary image in bounded-concurrency batches so a
// large catalog doesn't open hundreds of sockets at once.
async function fetchAllImages(
  products: ProductForExport[],
): Promise<Array<FetchedImage | null>> {
  const out: Array<FetchedImage | null> = new Array(products.length).fill(null);
  for (let i = 0; i < products.length; i += IMAGE_CONCURRENCY) {
    const slice = products.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.all(slice.map(fetchPrimaryImage));
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
  const images = await fetchAllImages(products);

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

    const img = images[i];
    if (img) {
      const imageId = workbook.addImage({
        buffer: img.buffer as unknown as ExcelJS.Buffer,
        extension: img.extension,
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
