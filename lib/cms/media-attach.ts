// Attach helpers: partial image mutations that avoid the full-payload
// update_* round-trip. Product gallery ops (append / remove / reorder) plus a
// generic single-image-field setter driven by ENTITY_IMAGE_FIELDS.
// Used by the MCP tools in lib/mcp/tools/media.ts.

import { prisma } from "@/lib/db";
import { CACHE_TAGS, type CacheTag } from "@/lib/api/server/tags";
import type {
  EntityImageTarget,
  EntityVideoTarget,
  UploadImageTarget,
} from "@/lib/validation/schemas";
import { normalizeVideoEmbedUrl } from "@/lib/markdown";
import { CmsError } from "./errors";

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  variations: true,
} as const;

async function requireProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { position: "asc" } },
      // Needed to turn an incoming variationSku into a variation id, and to
      // list the valid SKUs when one does not match.
      variations: { select: { id: true, sku: true } },
    },
  });
  if (!product) {
    throw new CmsError(`No product with id "${productId}".`, {
      statusCode: 404,
    });
  }
  return product;
}

export interface AttachImage {
  url: string;
  alt?: string | null;
  altNe?: string | null;
  /**
   * Attach this photo to one variation, named by SKU. Omitted or null puts it
   * in the product gallery, which is how every image behaved before
   * ProductImage gained a variation link.
   */
  variationSku?: string | null;
}

/**
 * Append images after the current last position. Sets thumbnailUrl to the
 * first new image when `setThumbnail` is true, or when the product has none.
 */
export async function addProductImages(
  productId: string,
  images: AttachImage[],
  opts: { setThumbnail?: boolean } = {},
) {
  const product = await requireProduct(productId);
  const maxPos = product.images.reduce((m, i) => Math.max(m, i.position), -1);
  const shouldSetThumb = opts.setThumbnail || !product.thumbnailUrl;

  const skuToId = new Map(product.variations.map((v) => [v.sku, v.id]));
  const rows = images.map((img, idx) => {
    const sku = img.variationSku ?? null;
    if (sku !== null && !skuToId.has(sku)) {
      throw new CmsError(
        `Product "${productId}" has no variation with SKU "${sku}".`,
        {
          statusCode: 400,
          referenceKind: "productVariation",
          availableOptions: product.variations.map((v) => v.sku),
        },
      );
    }
    return {
      productId,
      url: img.url,
      alt: img.alt ?? null,
      altNe: img.altNe ?? null,
      position: maxPos + 1 + idx,
      variationId: sku === null ? null : (skuToId.get(sku) as string),
    };
  });

  return prisma.$transaction(async (tx) => {
    await tx.productImage.createMany({ data: rows });
    if (shouldSetThumb) {
      await tx.product.update({
        where: { id: productId },
        data: { thumbnailUrl: images[0].url },
      });
    }
    return tx.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
  });
}

/**
 * Remove one image (by ProductImage id or exact url), clear thumbnailUrl if it
 * pointed at that image, and renumber the remaining positions 0..n-1.
 */
export async function removeProductImage(
  productId: string,
  ref: { imageId?: string; url?: string },
) {
  if (!ref.imageId && !ref.url) {
    throw new CmsError("Pass `imageId` or `url`.", { statusCode: 400 });
  }
  const product = await requireProduct(productId);
  const target = product.images.find((i) =>
    ref.imageId ? i.id === ref.imageId : i.url === ref.url,
  );
  if (!target) {
    throw new CmsError(
      `Product "${productId}" has no image matching ${ref.imageId ? `id "${ref.imageId}"` : `url "${ref.url}"`}.`,
      {
        statusCode: 404,
        referenceKind: "productImage",
        availableOptions: product.images.map((i) => `${i.id} ${i.url}`),
      },
    );
  }
  const remaining = product.images.filter((i) => i.id !== target.id);

  return prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: target.id } });
    for (const [idx, img] of remaining.entries()) {
      if (img.position !== idx) {
        await tx.productImage.update({
          where: { id: img.id },
          data: { position: idx },
        });
      }
    }
    if (product.thumbnailUrl === target.url) {
      await tx.product.update({
        where: { id: productId },
        data: { thumbnailUrl: remaining[0]?.url ?? null },
      });
    }
    return tx.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
  });
}

/**
 * Validate that `ordered` is a permutation of the product's image ids (or
 * urls) — returns the ids in the requested order. Pure; used by
 * reorderProductImages and unit tests.
 */
export function resolveImageOrder(
  existing: Array<{ id: string; url: string }>,
  ordered: string[],
): string[] {
  const byId = new Map(existing.map((i) => [i.id, i.id]));
  const byUrl = new Map(existing.map((i) => [i.url, i.id]));
  const ids: string[] = [];
  const seen = new Set<string>();
  const unknown: string[] = [];
  for (const ref of ordered) {
    const id = byId.get(ref) ?? byUrl.get(ref);
    if (!id) {
      unknown.push(ref);
      continue;
    }
    if (seen.has(id)) {
      throw new CmsError(`Duplicate image reference "${ref}" in order.`, {
        statusCode: 400,
      });
    }
    seen.add(id);
    ids.push(id);
  }
  if (unknown.length) {
    throw new CmsError(`Unknown image reference(s): ${unknown.join(", ")}.`, {
      statusCode: 400,
      referenceKind: "productImage",
      availableOptions: existing.map((i) => `${i.id} ${i.url}`),
    });
  }
  if (ids.length !== existing.length) {
    const missing = existing.filter((i) => !seen.has(i.id));
    throw new CmsError(
      `Order must list every image exactly once; missing ${missing.length}: ${missing.map((i) => i.id).join(", ")}.`,
      {
        statusCode: 400,
        referenceKind: "productImage",
        availableOptions: existing.map((i) => `${i.id} ${i.url}`),
      },
    );
  }
  return ids;
}

/** Set exact gallery order; `ordered` may mix ProductImage ids and urls. */
export async function reorderProductImages(
  productId: string,
  ordered: string[],
) {
  const product = await requireProduct(productId);
  const ids = resolveImageOrder(product.images, ordered);
  return prisma.$transaction(async (tx) => {
    // Two passes avoid transient collisions if a unique(position) index is
    // ever added; cheap for gallery-sized lists.
    for (const [idx, id] of ids.entries()) {
      await tx.productImage.update({
        where: { id },
        data: { position: 1000 + idx },
      });
    }
    for (const [idx, id] of ids.entries()) {
      await tx.productImage.update({ where: { id }, data: { position: idx } });
    }
    return tx.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
  });
}

// ─── Single-image fields on any entity ───────────────────────────────────────

interface EntityImageField {
  model: string;
  field: string;
  /** Lookup by id first (when the model has one), then by slug/key. */
  lookup: (ref: string) => Promise<{ where: Record<string, string> } | null>;
  update: (
    where: Record<string, string>,
    url: string | null,
  ) => Promise<unknown>;
  tags: CacheTag[];
}

async function byIdOrSlug(
  find: (where: Record<string, string>) => Promise<unknown | null>,
  ref: string,
): Promise<{ where: Record<string, string> } | null> {
  if (await find({ id: ref })) return { where: { id: ref } };
  if (await find({ slug: ref })) return { where: { slug: ref } };
  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ENTITY_IMAGE_FIELDS: Record<UploadImageTarget, EntityImageField> =
  {
    "category.imageUrl": {
      model: "Category",
      field: "imageUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.category.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.category.update({
          where: where as any,
          data: { imageUrl: url },
        }),
      tags: [CACHE_TAGS.categories, CACHE_TAGS.homepage],
    },
    "product.thumbnailUrl": {
      model: "Product",
      field: "thumbnailUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.product.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.product.update({
          where: where as any,
          data: { thumbnailUrl: url },
        }),
      tags: [CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections],
    },
    "product.ogImageUrl": {
      model: "Product",
      field: "ogImageUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.product.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.product.update({
          where: where as any,
          data: { ogImageUrl: url },
        }),
      tags: [CACHE_TAGS.products],
    },
    "bundle.thumbnailUrl": {
      model: "Bundle",
      field: "thumbnailUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.bundle.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.bundle.update({
          where: where as any,
          data: { thumbnailUrl: url },
        }),
      tags: [CACHE_TAGS.bundles, CACHE_TAGS.homepage],
    },
    "bundle.ogImageUrl": {
      model: "Bundle",
      field: "ogImageUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.bundle.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.bundle.update({
          where: where as any,
          data: { ogImageUrl: url },
        }),
      tags: [CACHE_TAGS.bundles],
    },
    "collection.heroImageUrl": {
      model: "Collection",
      field: "heroImageUrl",
      lookup: (ref) =>
        byIdOrSlug(
          (w) => prisma.collection.findUnique({ where: w as any }),
          ref,
        ),
      update: (where, url) =>
        prisma.collection.update({
          where: where as any,
          data: { heroImageUrl: url },
        }),
      tags: [CACHE_TAGS.collections, CACHE_TAGS.homepage],
    },
    "collection.ogImageUrl": {
      model: "Collection",
      field: "ogImageUrl",
      lookup: (ref) =>
        byIdOrSlug(
          (w) => prisma.collection.findUnique({ where: w as any }),
          ref,
        ),
      update: (where, url) =>
        prisma.collection.update({
          where: where as any,
          data: { ogImageUrl: url },
        }),
      tags: [CACHE_TAGS.collections],
    },
    "blogPost.heroImageUrl": {
      model: "BlogPost",
      field: "heroImageUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.blogPost.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.blogPost.update({
          where: where as any,
          data: { heroImageUrl: url },
        }),
      tags: [CACHE_TAGS.blog, CACHE_TAGS.homepage],
    },
    "blogPost.ogImageUrl": {
      model: "BlogPost",
      field: "ogImageUrl",
      lookup: (ref) =>
        byIdOrSlug((w) => prisma.blogPost.findUnique({ where: w as any }), ref),
      update: (where, url) =>
        prisma.blogPost.update({
          where: where as any,
          data: { ogImageUrl: url },
        }),
      tags: [CACHE_TAGS.blog],
    },
    "page.ogImageUrl": {
      model: "Page",
      field: "ogImageUrl",
      lookup: async (ref) =>
        (await prisma.page.findUnique({ where: { slug: ref } }))
          ? { where: { slug: ref } }
          : null,
      update: (where, url) =>
        prisma.page.update({ where: where as any, data: { ogImageUrl: url } }),
      tags: [CACHE_TAGS.pages],
    },
    "service.hero": {
      model: "Service",
      field: "hero",
      lookup: async (ref) =>
        (await prisma.service.findUnique({ where: { slug: ref } }))
          ? { where: { slug: ref } }
          : null,
      update: (where, url) =>
        prisma.service.update({ where: where as any, data: { hero: url } }),
      tags: [CACHE_TAGS.services, CACHE_TAGS.homepage],
    },
    "service.ogImageUrl": {
      model: "Service",
      field: "ogImageUrl",
      lookup: async (ref) =>
        (await prisma.service.findUnique({ where: { slug: ref } }))
          ? { where: { slug: ref } }
          : null,
      update: (where, url) =>
        prisma.service.update({
          where: where as any,
          data: { ogImageUrl: url },
        }),
      tags: [CACHE_TAGS.services],
    },
  };
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Fields inside the SiteConfig / HomepageConfig JSON singletons ───────────

type ConfigImageTarget = Exclude<EntityImageTarget, UploadImageTarget>;

interface ConfigField {
  model: "SiteConfig" | "HomepageConfig";
  /** Path inside the row's `data` JSON. */
  path: string[];
  /** Stored when clearing: required string fields keep "" rather than null. */
  cleared: string | null;
  tags: CacheTag[];
}

export const CONFIG_IMAGE_FIELDS: Record<ConfigImageTarget, ConfigField> = {
  "homepage.heroImage": {
    model: "HomepageConfig",
    path: ["heroImage"],
    cleared: null,
    tags: [CACHE_TAGS.homepage],
  },
  "site.logoUrl": {
    model: "SiteConfig",
    path: ["branding", "logoUrl"],
    cleared: "",
    tags: [CACHE_TAGS.site],
  },
  "site.faviconUrl": {
    model: "SiteConfig",
    path: ["branding", "faviconUrl"],
    cleared: "",
    tags: [CACHE_TAGS.site],
  },
  "site.ogImage": {
    model: "SiteConfig",
    path: ["seo", "ogImage"],
    cleared: "",
    tags: [CACHE_TAGS.site],
  },
};

type Json = Record<string, unknown>;

function setPath(obj: Json, path: string[], value: unknown): Json {
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...obj, [head]: value };
  const child = obj[head];
  return {
    ...obj,
    [head]: setPath(
      child && typeof child === "object" ? (child as Json) : {},
      rest,
      value,
    ),
  };
}

/**
 * Merge one value into a config singleton's JSON without touching the rest —
 * never parse-and-replace, which drops keys the schema doesn't list (e.g.
 * SiteConfig.data.modules).
 */
async function patchConfig(
  model: ConfigField["model"],
  path: string[],
  value: unknown,
): Promise<Json> {
  const row =
    model === "SiteConfig"
      ? await prisma.siteConfig.findUnique({ where: { id: 1 } })
      : await prisma.homepageConfig.findUnique({ where: { id: 1 } });
  if (!row && model === "SiteConfig") {
    throw new CmsError(
      "Site config has not been saved yet — set it up once in the admin first.",
      { statusCode: 404, referenceKind: model },
    );
  }
  const next = setPath((row?.data as Json | null) ?? {}, path, value);
  const args = {
    where: { id: 1 },
    update: { data: next as object },
    create: { id: 1, data: next as object },
  };
  if (model === "SiteConfig") await prisma.siteConfig.upsert(args);
  else await prisma.homepageConfig.upsert(args);
  return next;
}

function isConfigTarget(t: EntityImageTarget): t is ConfigImageTarget {
  return t in CONFIG_IMAGE_FIELDS;
}

/**
 * Set (or clear with null) one image URL field on an entity. `entityId` is
 * the id, or the slug/key for slug-keyed models; it is ignored for the
 * homepage.* / site.* singletons. Returns the updated row and the cache tags
 * the caller should bump.
 */
export async function setEntityImage(
  target: EntityImageTarget,
  entityId: string | undefined,
  url: string | null,
) {
  if (isConfigTarget(target)) {
    const def = CONFIG_IMAGE_FIELDS[target];
    const row = await patchConfig(def.model, def.path, url ?? def.cleared);
    return { row, tags: def.tags, model: def.model, field: def.path.join(".") };
  }
  const def = ENTITY_IMAGE_FIELDS[target];
  if (!def) {
    throw new CmsError(`Unknown target "${target}".`, {
      statusCode: 400,
      availableOptions: [
        ...Object.keys(ENTITY_IMAGE_FIELDS),
        ...Object.keys(CONFIG_IMAGE_FIELDS),
      ],
    });
  }
  if (!entityId) {
    throw new CmsError(`entityId is required for target "${target}".`, {
      statusCode: 400,
    });
  }
  const found = await def.lookup(entityId);
  if (!found) {
    throw new CmsError(`No ${def.model} with id/slug "${entityId}".`, {
      statusCode: 404,
      referenceKind: def.model,
    });
  }
  const row = await def.update(found.where, url);
  return { row, tags: def.tags, model: def.model, field: def.field };
}

/**
 * Label for an upload-link slot that targets an image field. Throws (404) when
 * the entity doesn't exist, so a bad target fails at link creation.
 */
export async function describeImageTarget(
  target: UploadImageTarget,
  entityId: string,
): Promise<string> {
  const def = ENTITY_IMAGE_FIELDS[target];
  const found = await def.lookup(entityId);
  if (!found) {
    throw new CmsError(`No ${def.model} with id/slug "${entityId}".`, {
      statusCode: 404,
      referenceKind: def.model,
    });
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const key = def.model.charAt(0).toLowerCase() + def.model.slice(1);
  const row = await (prisma as any)[key].findUnique({ where: found.where });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const name = row?.name ?? row?.title ?? row?.slug ?? entityId;
  return `${def.model} “${name}” · ${def.field}`;
}

// ─── Single video-embed fields ───────────────────────────────────────────────

/**
 * Set (or clear with null) a hero video embed. Any YouTube/Vimeo link is
 * normalized to its embed URL before storing — the storefront drops the value
 * straight into an <iframe>, where watch / youtu.be / vimeo.com pages refuse
 * to load.
 */
export async function setEntityVideo(
  target: EntityVideoTarget,
  entityId: string | undefined,
  url: string | null,
) {
  let embed: string | null = null;
  if (url) {
    embed = normalizeVideoEmbedUrl(url);
    if (!embed) {
      throw new CmsError(
        "Only YouTube and Vimeo links are supported (watch, youtu.be, shorts, embed or vimeo.com URLs).",
        { statusCode: 400 },
      );
    }
  }
  if (target === "homepage.heroVideoEmbedUrl") {
    const row = await patchConfig(
      "HomepageConfig",
      ["heroVideoEmbedUrl"],
      embed,
    );
    return { row, embed, tags: [CACHE_TAGS.homepage], model: "HomepageConfig" };
  }
  if (!entityId) {
    throw new CmsError(`entityId is required for target "${target}".`, {
      statusCode: 400,
    });
  }
  const found = await byIdOrSlug(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w) => prisma.blogPost.findUnique({ where: w as any }),
    entityId,
  );
  if (!found) {
    throw new CmsError(`No BlogPost with id/slug "${entityId}".`, {
      statusCode: 404,
      referenceKind: "BlogPost",
    });
  }
  const row = await prisma.blogPost.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: found.where as any,
    data: { heroVideoEmbedUrl: embed },
  });
  return {
    row,
    embed,
    tags: [CACHE_TAGS.blog, CACHE_TAGS.homepage],
    model: "BlogPost",
  };
}
