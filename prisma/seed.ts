// Seed PostgreSQL from /data/mock/*.ts so the new live API has the same
// content the static site shipped with. Idempotent: re-runnable on every
// container start.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  await prisma.adminUser.create({
    data: { email, passwordHash, name: "Admin" },
  });
  console.log(`✓ admin: created ${email}`);
}

async function seedSite() {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: { data: mockSite as object },
    create: { id: 1, data: mockSite as object },
  });
  console.log("✓ site config");
}

async function seedElements() {
  for (const [i, el] of ELEMENTS.entries()) {
    await prisma.element.upsert({
      where: { slug: el.slug },
      update: { ...el, position: i },
      create: { ...el, position: i },
    });
  }
  console.log(`✓ elements: ${ELEMENTS.length}`);
}

async function seedCategories() {
  const elementCategorySlugs = ["metal", "earth", "wood", "plant", "water", "air"];
  const deleted = await prisma.category.deleteMany({
    where: { slug: { in: elementCategorySlugs } },
  });
  if (deleted.count > 0) {
    console.log(`· categories: removed ${deleted.count} legacy element-named rows`);
  }

  for (const [i, c] of mockCategories.entries()) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        slug: c.slug,
        name: c.name,
        imageUrl: c.imageUrl,
        position: i,
      },
      create: {
        id: c.id,
        slug: c.slug,
        name: c.name,
        imageUrl: c.imageUrl,
        position: i,
      },
    });
  }
  console.log(`✓ categories: ${mockCategories.length}`);
}

async function seedProducts() {
  for (const [i, p] of mockProducts.entries()) {
    const isFeatured = (p.tags ?? []).some(
      (t) => t.toLowerCase() === "featured",
    );

    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        currency: p.currency,
        thumbnailUrl: p.thumbnailUrl,
        vendorId: p.vendorId,
        elementSlugs: p.elementSlugs ?? [],
        isFeatured,
        position: i,
        status: "published",
        publishedAt: new Date(p.createdAt),
        tags: p.tags ?? [],
        categoryId: p.categoryId,
      },
      create: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        currency: p.currency,
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
    });

    // Replace images and variations to match the seed exactly.
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    await prisma.productImage.createMany({
      data: p.images.map((url, idx) => ({
        productId: p.id,
        url,
        position: idx,
      })),
    });

    await prisma.productVariation.deleteMany({ where: { productId: p.id } });
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
  }
  console.log(`✓ products: ${mockProducts.length}`);
}

async function seedBlog() {
  for (const c of mockBlogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { slug: c.slug, name: c.name, description: c.description },
    });
  }
  for (const p of mockPosts) {
    await prisma.blogPost.upsert({
      where: { id: p.id },
      update: {
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
      create: {
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
    });
  }
  console.log(`✓ blog: ${mockBlogCategories.length} cat, ${mockPosts.length} posts`);
}

async function seedBundles() {
  for (const [i, b] of mockBundles.entries()) {
    await prisma.bundle.upsert({
      where: { id: b.id },
      update: {
        slug: b.slug,
        title: b.title,
        description: b.description,
        price: b.price,
        compareAtPrice: b.compareAtPrice ?? null,
        position: i,
      },
      create: {
        id: b.id,
        slug: b.slug,
        title: b.title,
        description: b.description,
        price: b.price,
        compareAtPrice: b.compareAtPrice ?? null,
        position: i,
      },
    });
    await prisma.bundleItem.deleteMany({ where: { bundleId: b.id } });
    await prisma.bundleItem.createMany({
      data: b.items.map((it, idx) => ({
        bundleId: b.id,
        productId: it.productId,
        quantity: it.quantity,
        position: idx,
      })),
    });
  }
  console.log(`✓ bundles: ${mockBundles.length}`);
}

async function seedCollections() {
  for (const [i, c] of mockCollections.entries()) {
    const id = `coll-${c.slug}`;
    await prisma.collection.upsert({
      where: { id },
      update: {
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        position: i,
      },
      create: {
        id,
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        position: i,
      },
    });
    await prisma.collectionProduct.deleteMany({ where: { collectionId: id } });
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
  }
  console.log(`✓ collections: ${mockCollections.length}`);
}

async function seedPages() {
  for (const p of mockPages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        bodyMarkdown: p.bodyMarkdown,
        publishedAt: new Date(p.publishedAt),
        seoTitle: p.seoTitle ?? null,
        seoDescription: p.seoDescription ?? null,
      },
      create: {
        slug: p.slug,
        title: p.title,
        bodyMarkdown: p.bodyMarkdown,
        publishedAt: new Date(p.publishedAt),
        seoTitle: p.seoTitle ?? null,
        seoDescription: p.seoDescription ?? null,
      },
    });
  }
  console.log(`✓ pages: ${mockPages.length}`);
}

async function seedServices() {
  for (const [i, s] of mockServices.entries()) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
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
      create: {
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
    });
  }
  console.log(`✓ services: ${mockServices.length}`);
}

async function seedShowrooms() {
  for (const [i, s] of mockShowrooms.entries()) {
    await prisma.showroom.upsert({
      where: { key: s.key },
      update: {
        name: s.name,
        address: s.address,
        whatsapp: s.whatsapp,
        mapEmbedUrl: s.mapEmbedUrl,
        position: i,
      },
      create: {
        key: s.key,
        name: s.name,
        address: s.address,
        whatsapp: s.whatsapp,
        mapEmbedUrl: s.mapEmbedUrl,
        position: i,
      },
    });
  }
  console.log(`✓ showrooms: ${mockShowrooms.length}`);
}

async function seedNepaliExamples() {
  // Authentic Nepali for the demo content so /ne renders bilingual out of the
  // box and the i18n audit has real coverage. Long-form bodies (product
  // descriptions, page/blog markdown) are intentionally left for human
  // translation via /sysuser — the audit surfaces what remains.
  const elementNames: Record<string, string> = {
    metal: "धातु", earth: "पृथ्वी", wood: "काठ",
    plant: "वनस्पति", water: "पानी", air: "हावा",
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

  let n = 0;
  for (const [slug, nameNe] of Object.entries(elementNames))
    n += (await prisma.element.updateMany({ where: { slug }, data: { nameNe } })).count;
  for (const [slug, nameNe] of Object.entries(categoryNames))
    n += (await prisma.category.updateMany({ where: { slug }, data: { nameNe } })).count;
  for (const [slug, nameNe] of Object.entries(productNames))
    n += (await prisma.product.updateMany({ where: { slug }, data: { nameNe } })).count;
  for (const [slug, titleNe] of Object.entries(bundleTitles))
    n += (await prisma.bundle.updateMany({ where: { slug }, data: { titleNe } })).count;
  for (const [slug, data] of Object.entries(collections))
    n += (await prisma.collection.updateMany({ where: { slug }, data })).count;
  for (const [slug, titleNe] of Object.entries(pageTitles))
    n += (await prisma.page.updateMany({ where: { slug }, data: { titleNe } })).count;

  n += (
    await prisma.service.updateMany({
      where: { slug: "tibetan-bowl-therapy" },
      data: {
        nameNe: "तिब्बती कटोरा थेरापी",
        durationNe: "६० मिनेट",
        summaryNe: "तिब्बती गायनकटोराको कम्पनद्वारा गहिरो विश्राम र पुनःसन्तुलन।",
      },
    })
  ).count;
  n += (
    await prisma.blogPost.updateMany({
      where: { slug: "shaman-stories-the-origin" },
      data: {
        titleNe: "शमन कथाहरू: तत्वहरूतर्फ फिर्ती — भाग ०१: उत्पत्ति",
        excerptNe:
          "तत्वहरू, अदृश्य शक्तिहरू, र प्रकृतिको ज्ञानभित्रको यात्राको पहिलो भाग।",
      },
    })
  ).count;

  console.log(`✓ nepali examples: ${n} rows translated`);
}

async function seedHomepage() {
  await prisma.homepageConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
      },
    },
  });
  console.log("✓ homepage config");
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
  await seedNepaliExamples();
  await seedHomepage();
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
