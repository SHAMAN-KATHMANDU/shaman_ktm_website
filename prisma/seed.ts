// Seed PostgreSQL from /data/mock/*.ts so a fresh database has the content
// the static site shipped with. CREATE-ONLY: existing rows are never updated
// and their children are never rebuilt — live content belongs to the admin
// UI / MCP. Safe to re-run on every container start (RUN_DB_SEED=1), though
// prod should keep that flag at 0 after the first deploy. The only writes to
// existing rows are the explicitly guarded fill-only backfills
// (seedNepaliExamples) and the reporting lookups, whose updates deliberately
// exclude admin-owned fields.

import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { ensureRow } from "./seed-helpers";

import { mockSite } from "../data/mock/site";
import { ELEMENTS } from "../data/mock/elements";
import { mockCategories } from "../data/mock/categories";
import { mockProducts } from "../data/mock/products";
import { mockPosts, mockBlogCategories } from "../data/mock/posts";
import { mockBundles } from "../data/mock/bundles";
import { mockCollections } from "../data/mock/collections";
import { mockPages } from "../data/mock/pages";
import { mockServices } from "../data/mock/services";
import { mockShowrooms } from "../data/mock/showrooms";

const prisma = new PrismaClient();

async function seedAdmin() {
  const count = await prisma.adminUser.count();
  if (count > 0) {
    console.log("· admin: already exists, skipping bootstrap");
    return;
  }
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.warn(
      "! admin: ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD not set — no admin created. Set them and re-run db:seed.",
    );
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  // role MUST be set explicitly. AdminUser.role defaults to "staff" (the
  // least-privilege rung), which is right for an account someone creates from
  // the admin panel and wrong for this one: this is the FIRST account on a new
  // deployment, and user management is owner-only. A staff bootstrap admin
  // cannot create other users, edit the catalogue or change site settings, and
  // cannot promote itself — a fresh install would be locked out of its own CMS.
  await prisma.adminUser.create({
    data: { email, passwordHash, name: "Admin", role: "owner" },
  });
  console.log(`✓ admin: created ${email} as owner`);
}

async function seedSite() {
  const created = await ensureRow(
    () => prisma.siteConfig.findUnique({ where: { id: 1 }, select: { id: true } }),
    () => prisma.siteConfig.create({ data: { id: 1, data: mockSite as object } }),
  );
  console.log(created ? "✓ site config: created" : "· site config: exists, untouched");
}

async function seedElements() {
  let created = 0;
  for (const [i, el] of ELEMENTS.entries()) {
    const made = await ensureRow(
      () => prisma.element.findUnique({ where: { slug: el.slug }, select: { slug: true } }),
      () => prisma.element.create({ data: { ...el, position: i } }),
    );
    if (made) created++;
  }
  console.log(`✓ elements: ${created} created, ${ELEMENTS.length - created} existing untouched`);
}

async function seedCategories() {
  const elementCategorySlugs = ["metal", "earth", "wood", "plant", "water", "air"];
  const deleted = await prisma.category.deleteMany({
    where: { slug: { in: elementCategorySlugs } },
  });
  if (deleted.count > 0) {
    console.log(`· categories: removed ${deleted.count} legacy element-named rows`);
  }

  let created = 0;
  for (const [i, c] of mockCategories.entries()) {
    const made = await ensureRow(
      () => prisma.category.findUnique({ where: { id: c.id }, select: { id: true } }),
      () =>
        prisma.category.create({
          data: {
            id: c.id,
            slug: c.slug,
            name: c.name,
            imageUrl: c.imageUrl,
            position: i,
          },
        }),
    );
    if (made) created++;
  }
  console.log(`✓ categories: ${created} created, ${mockCategories.length - created} existing untouched`);
}

async function seedProducts() {
  let created = 0;
  for (const [i, p] of mockProducts.entries()) {
    const isFeatured = (p.tags ?? []).some(
      (t) => t.toLowerCase() === "featured",
    );

    // Images/variations ride along in onCreate: they exist only for rows this
    // run created, so a live product's gallery and variant prices stay intact.
    const made = await ensureRow(
      () => prisma.product.findUnique({ where: { id: p.id }, select: { id: true } }),
      () =>
        prisma.product.create({
          data: {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            price: p.price,
            compareAtPrice: p.compareAtPrice ?? null,
            currency: p.currency,
            stockQuantity: p.stockQuantity ?? null,
            dimensions: p.dimensions ? (p.dimensions as unknown as Prisma.InputJsonValue) : undefined,
            thumbnailUrl: p.thumbnailUrl,
            vendorId: p.vendorId,
            elementSlugs: p.elementSlugs ?? [],
            isFeatured,
            position: i,
            status: "published",
            publishedAt: new Date(p.createdAt),
            tags: p.tags ?? [],
            categoryId: p.categoryId,
            createdAt: new Date(p.createdAt),
          },
        }),
      async () => {
        await prisma.productImage.createMany({
          data: p.images.map((url, idx) => ({
            productId: p.id,
            url,
            position: idx,
          })),
        });
        await prisma.productVariation.createMany({
          data: p.variations.map((v) => ({
            id: v.id,
            productId: p.id,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            attributes: v.attributes as object,
          })),
        });
        await prisma.stockLevel.createMany({
          data: p.variations.map((v) => ({
            variationId: v.id,
            showroomKey: "online",
            qty: v.stock,
          })),
        });
        await prisma.stockMovement.createMany({
          data: p.variations
            .filter((v) => v.stock > 0)
            .map((v) => ({
              variationId: v.id,
              showroomKey: "online",
              delta: v.stock,
              reason: "initial_seed",
              note: "Opening Online balance from seed data",
            })),
        });
      },
    );
    if (made) created++;
  }
  console.log(`✓ products: ${created} created, ${mockProducts.length - created} existing untouched`);
}

async function seedBlog() {
  for (const c of mockBlogCategories) {
    await ensureRow(
      () => prisma.blogCategory.findUnique({ where: { slug: c.slug }, select: { slug: true } }),
      () =>
        prisma.blogCategory.create({
          data: { slug: c.slug, name: c.name, description: c.description },
        }),
    );
  }
  for (const p of mockPosts) {
    await ensureRow(
      () => prisma.blogPost.findUnique({ where: { id: p.id }, select: { id: true } }),
      () =>
        prisma.blogPost.create({
          data: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            bodyMarkdown: p.bodyMarkdown,
            heroImageUrl: p.heroImageUrl,
            heroVideoEmbedUrl: p.heroVideoEmbedUrl,
            authorName: p.authorName,
            categorySlug: p.category.slug,
            tags: p.tags,
            isFeatured: true,
            status: "published",
            publishedAt: new Date(p.publishedAt),
            readingMinutes: p.readingMinutes,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
          },
        }),
    );
  }
  console.log(`✓ blog: ${mockBlogCategories.length} cat, ${mockPosts.length} posts`);
}

async function seedBundles() {
  let created = 0;
  for (const [i, b] of mockBundles.entries()) {
    const made = await ensureRow(
      () => prisma.bundle.findUnique({ where: { id: b.id }, select: { id: true } }),
      () =>
        prisma.bundle.create({
          data: {
            id: b.id,
            slug: b.slug,
            title: b.title,
            description: b.description,
            price: b.price,
            compareAtPrice: b.compareAtPrice ?? null,
            position: i,
          },
        }),
      async () => {
        await prisma.bundleItem.createMany({
          data: b.items.map((it, idx) => ({
            bundleId: b.id,
            productId: it.productId,
            quantity: it.quantity,
            position: idx,
          })),
        });
      },
    );
    if (made) created++;
  }
  console.log(`✓ bundles: ${created} created, ${mockBundles.length - created} existing untouched`);
}

async function seedCollections() {
  let created = 0;
  for (const [i, c] of mockCollections.entries()) {
    const id = `coll-${c.slug}`;
    const made = await ensureRow(
      () => prisma.collection.findUnique({ where: { id }, select: { id: true } }),
      () =>
        prisma.collection.create({
          data: {
            id,
            slug: c.slug,
            title: c.title,
            subtitle: c.subtitle,
            position: i,
          },
        }),
      async () => {
        if (c.products.length) {
          await prisma.collectionProduct.createMany({
            data: c.products.map((p, idx) => ({
              collectionId: id,
              productId: p.id,
              position: idx,
            })),
            skipDuplicates: true,
          });
        }
      },
    );
    if (made) created++;
  }
  console.log(`✓ collections: ${created} created, ${mockCollections.length - created} existing untouched`);
}

async function seedPages() {
  let created = 0;
  for (const p of mockPages) {
    const made = await ensureRow(
      () => prisma.page.findUnique({ where: { slug: p.slug }, select: { slug: true } }),
      () =>
        prisma.page.create({
          data: {
            slug: p.slug,
            title: p.title,
            bodyMarkdown: p.bodyMarkdown,
            publishedAt: new Date(p.publishedAt),
            seoTitle: p.seoTitle ?? null,
            seoDescription: p.seoDescription ?? null,
          },
        }),
    );
    if (made) created++;
  }
  console.log(`✓ pages: ${created} created, ${mockPages.length - created} existing untouched`);
}

async function seedServices() {
  let created = 0;
  for (const [i, s] of mockServices.entries()) {
    const made = await ensureRow(
      () => prisma.service.findUnique({ where: { slug: s.slug }, select: { slug: true } }),
      () =>
        prisma.service.create({
          data: {
            slug: s.slug,
            name: s.name,
            element: s.element,
            duration: s.duration,
            pricePerSession: s.pricePerSession,
            hero: s.hero,
            summary: s.summary,
            whatToExpect: s.whatToExpect as object,
            relatedProductSlugs: s.relatedProductSlugs,
            position: i,
          },
        }),
    );
    if (made) created++;
  }
  console.log(`✓ services: ${created} created, ${mockServices.length - created} existing untouched`);
}

async function seedShowrooms() {
  let created = 0;
  for (const [i, s] of mockShowrooms.entries()) {
    const made = await ensureRow(
      () => prisma.showroom.findUnique({ where: { key: s.key }, select: { key: true } }),
      () =>
        prisma.showroom.create({
          data: {
            key: s.key,
            name: s.name,
            address: s.address,
            whatsapp: s.whatsapp,
            mapEmbedUrl: s.mapEmbedUrl,
            position: i,
          },
        }),
    );
    if (made) created++;
  }
  console.log(`✓ showrooms: ${created} created, ${mockShowrooms.length - created} existing untouched`);
}

// Reporting-system lookups (spec seed lists, verbatim). Fill-only upserts:
// labels are stable ids for staff vocabulary — admins manage activation via
// the admin UI/MCP, so updates never overwrite `active`.
async function seedReportingLookups() {
  const paymentMethods: {
    label: string;
    channel: string;
    provider?: string;
  }[] = [
    { label: "Cash", channel: "cash" },
    { label: "HML QR", channel: "qr", provider: "HML" },
    { label: "HML Card", channel: "card", provider: "HML" },
    { label: "Muktinath QR", channel: "qr", provider: "Muktinath" },
    { label: "Muktinath eSewa", channel: "qr", provider: "eSewa" },
    { label: "Muktinath FonePay", channel: "qr", provider: "FonePay" },
    { label: "Bank Transfer", channel: "bank" },
    { label: "Cash on Delivery", channel: "cod" },
    { label: "Online (website)", channel: "online" },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethodLookup.upsert({
      where: { label: pm.label },
      update: { channel: pm.channel, provider: pm.provider ?? null },
      create: {
        label: pm.label,
        channel: pm.channel,
        provider: pm.provider ?? null,
      },
    });
  }

  const leadSources = [
    "SMS",
    "WhatsApp",
    "Facebook Messenger",
    "Instagram DM",
    "Phone Call",
    "Walk-in",
    "Website",
    "Referral",
  ];
  for (const label of leadSources) {
    await prisma.leadSource.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }

  const couriers = [
    "inDrive",
    "NCM",
    "Pathao",
    "Self-delivery",
    "Customer pickup",
  ];
  for (const label of couriers) {
    await prisma.courier.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }

  // B2B trade tiers, lifted from the existing Shrawan target list so past
  // workbooks reconcile against the same numbers.
  const tiers = [
    {
      tier: 1,
      label: "Tier 1",
      minOrderValue: 10000,
      maxOrderValue: 25000,
      discountPct: 15,
      targetMarginPct: 57,
      commissionPct: 3,
    },
    {
      tier: 2,
      label: "Tier 2",
      minOrderValue: 25000,
      maxOrderValue: 75000,
      discountPct: 20,
      targetMarginPct: 54,
      commissionPct: 5,
    },
    {
      tier: 3,
      label: "Tier 3",
      minOrderValue: 75000,
      maxOrderValue: null,
      discountPct: 25,
      targetMarginPct: 51,
      commissionPct: 7,
    },
  ];
  for (const t of tiers) {
    await prisma.b2bTier.upsert({
      where: { tier: t.tier },
      update: {
        label: t.label,
        minOrderValue: t.minOrderValue,
        maxOrderValue: t.maxOrderValue,
        discountPct: t.discountPct,
        targetMarginPct: t.targetMarginPct,
        commissionPct: t.commissionPct,
      },
      create: t,
    });
  }

  console.log(
    `✓ reporting lookups: ${paymentMethods.length} payment methods, ${leadSources.length} lead sources, ${couriers.length} couriers, ${tiers.length} B2B tiers`,
  );
}

async function seedNepaliExamples() {
  // Authentic Nepali for the demo content so /ne renders bilingual out of the
  // box and the i18n audit has real coverage. Long-form bodies (product
  // descriptions, page/blog markdown) are intentionally left for human
  // translation via /sysuser — the audit surfaces what remains.
  //
  // Fill-only: every update is guarded to rows whose *Ne column is still
  // NULL/empty. The seed may rerun on any container start (RUN_DB_SEED=1),
  // so an unguarded backfill silently reverts curated translations set via
  // /sysuser or MCP set_nepali_fields on each deploy.
  const elementNames: Record<string, string> = {
    metal: "धातु", earth: "पृथ्वी", wood: "काठ",
    plant: "बिरुवा", water: "पानी", air: "हावा",
  };
  const categoryNames: Record<string, string> = {
    "singing-bowls": "गायनकटोरा",
    bracelets: "ब्रेसलेट",
    statues: "मूर्तिहरू",
    "incense-and-resin": "धूप र राल",
    wellness: "सुस्वास्थ्य",
    "home-and-altar": "घर र पूजाकोठा",
  };
  const productNames: Record<string, string> = {
    "singing-bowl": "गायनकटोरा",
    "canned-himalayan-oxygen": "क्यानमा हिमाली अक्सिजन",
    "sunstone-pearl-bracelet": "सनस्टोन र मोती ब्रेसलेट",
    "rose-quartz-pearl-bracelet": "रोज क्वार्ट्ज र मोती ब्रेसलेट",
    "green-aventurine-pearl-bracelet": "ग्रिन एभेन्चुरिन र मोती ब्रेसलेट",
    "white-howlite-pearl-bracelet": "ह्वाइट हाउलाइट र मोती ब्रेसलेट",
    "carnelian-pearl-bracelet": "कार्नेलियन र मोती ब्रेसलेट",
    "tigers-eye-pearl-bracelet": "टाइगर्स आई र मोती ब्रेसलेट",
    "prehnite-pearl-bracelet": "प्रेनाइट र मोती ब्रेसलेट",
    "ganesh-statue": "हस्तकला काठको गणेश मूर्ति",
  };
  const bundleTitles: Record<string, string> = {
    "shaman-starter": "शमन स्टार्टर",
    "earth-water-trio": "पृथ्वी र पानी त्रयी",
    "metal-air": "धातु र हावा",
  };
  const collections: Record<string, { titleNe: string; subtitleNe: string }> = {
    "new-releases": { titleNe: "नयाँ आगमन", subtitleNe: "यस मौसममा भर्खरै आइपुगेका" },
    "shaman-essentials": {
      titleNe: "शमन अत्यावश्यक",
      subtitleNe: "भित्र पस्नेबित्तिकै हामीले दिने पहिलो वस्तुहरू",
    },
  };
  const pageTitles: Record<string, string> = {
    about: "हाम्रोबारे",
    faq: "प्रश्नोत्तर",
    privacy: "गोपनीयता नीति",
    terms: "सर्त तथा नियमहरू",
  };

  // Matches rows where `field` has no translation yet (NULL or empty string).
  const missing = (field: string) => ({
    OR: [{ [field]: null }, { [field]: "" }],
  });

  let n = 0;
  for (const [slug, nameNe] of Object.entries(elementNames))
    n += (await prisma.element.updateMany({ where: { slug, ...missing("nameNe") }, data: { nameNe } })).count;
  for (const [slug, nameNe] of Object.entries(categoryNames))
    n += (await prisma.category.updateMany({ where: { slug, ...missing("nameNe") }, data: { nameNe } })).count;
  for (const [slug, nameNe] of Object.entries(productNames))
    n += (await prisma.product.updateMany({ where: { slug, ...missing("nameNe") }, data: { nameNe } })).count;
  for (const [slug, titleNe] of Object.entries(bundleTitles))
    n += (await prisma.bundle.updateMany({ where: { slug, ...missing("titleNe") }, data: { titleNe } })).count;
  for (const [slug, data] of Object.entries(collections)) {
    n += (await prisma.collection.updateMany({ where: { slug, ...missing("titleNe") }, data: { titleNe: data.titleNe } })).count;
    n += (await prisma.collection.updateMany({ where: { slug, ...missing("subtitleNe") }, data: { subtitleNe: data.subtitleNe } })).count;
  }
  for (const [slug, titleNe] of Object.entries(pageTitles))
    n += (await prisma.page.updateMany({ where: { slug, ...missing("titleNe") }, data: { titleNe } })).count;

  // Approved copy from the Nepali localization reference document.
  const bowlTherapy: Record<string, string> = {
    nameNe: "तिब्बती बाउल थेरापी",
    durationNe: "६० मिनेट",
    summaryNe:
      "हातले घनाइएका तिब्बती बाउल, टिङ्सा, र लामो-बिस्तारो ध्वनिको तहसहितको एक घण्टाको साउन्ड बाथ।",
  };
  for (const [field, value] of Object.entries(bowlTherapy))
    n += (
      await prisma.service.updateMany({
        where: { slug: "tibetan-bowl-therapy", ...missing(field) },
        data: { [field]: value },
      })
    ).count;

  const originPost: Record<string, string> = {
    titleNe: "शमन कथाहरू: तत्वहरूतर्फ फिर्ती — भाग ०१: उत्पत्ति",
    excerptNe:
      "तत्वहरू, अदृश्य शक्तिहरू, र प्रकृतिको ज्ञानभित्रको यात्राको पहिलो भाग।",
  };
  for (const [field, value] of Object.entries(originPost))
    n += (
      await prisma.blogPost.updateMany({
        where: { slug: "shaman-stories-the-origin", ...missing(field) },
        data: { [field]: value },
      })
    ).count;

  console.log(`✓ nepali examples: ${n} rows translated (fill-only)`);
}

async function seedHomepage() {
  const created = await ensureRow(
    () => prisma.homepageConfig.findUnique({ where: { id: 1 }, select: { id: true } }),
    () =>
      prisma.homepageConfig.create({
        data: {
          id: 1,
          data: {
            heroImage: "/stories-banner.jpeg",
            heroVideoEmbedUrl: null,
            newReleasesProductIds: mockProducts
              .filter((p) => p.tags?.includes("featured" as never))
              .map((p) => p.id),
            featuredPostIds: mockPosts.map((p) => p.id),
            elementSpotlightProductIds: {
              metal: [],
              earth: [],
              wood: [],
              plant: [],
              water: [],
              air: [],
            },
            // Leave services un-curated so the home page auto-reflects the live
            // services (first 3 by position). The curator can pin a specific set
            // in /sysuser/homepage; an empty list means "show the backend".
            servicesPreviewSlugs: [],
            // New-homepage sections stay unconfigured on a fresh install: the
            // offers grid renders nothing until cards are added, and the campaign
            // rail / clearance sections are also gated by their module flags.
            offersCards: [],
            campaignRail: null,
            clearance: null,
          },
        },
      }),
  );
  console.log(created ? "✓ homepage config: created" : "· homepage config: exists, untouched");
}

async function main() {
  console.log("Seeding database…");
  await seedAdmin();
  await seedSite();
  await seedElements();
  await seedCategories();
  await seedProducts();
  await seedBlog();
  await seedBundles();
  await seedCollections();
  await seedPages();
  await seedServices();
  await seedShowrooms();
  await seedReportingLookups();
  await seedNepaliExamples();
  await seedHomepage();
  if (process.env.SEED_STOCK === "1" || process.env.SEED_STOCK === "true") {
    // One-shot launch-stock import (spec decision #14: seed = stock only).
    const { seedStockFromCsv } = await import(
      "../scripts/seed-stock-from-csv"
    );
    await seedStockFromCsv();
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
