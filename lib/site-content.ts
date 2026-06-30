// Server-only accessors for editable site copy and branding extras stored
// inside SiteConfig.data. The frontend reads these so every visible string
// on the home page (hero, brand strip, section headings) is editable from
// /sysuser/site without touching code.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import type { WithNepali } from "@/lib/i18n/locale";

export interface BrandStripCard {
  title: string;
  body: string;
}

// English-only base shape. The exported `HomeCopy` adds an optional `<field>Ne`
// twin for every key (see `WithNepali`), so a row may carry Nepali copy.
interface HomeCopyBase {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  brandStripLines: string[];
  brandStripCards: BrandStripCard[];
  elementsHeading: string;
  elementsSubheading: string;
  categoriesEyebrow: string;
  categoriesHeading: string;
  categoriesSubheading: string;
  newReleasesEyebrow: string;
  newReleasesHeading: string;
  newReleasesSubheading: string;
  featuredProductsEyebrow: string;
  featuredProductsHeading: string;
  featuredProductsSubheading: string;
  featuredStoryEyebrow: string;
  featuredStoryHeading: string;
  featuredStorySubheading: string;
  servicesEyebrow: string;
  servicesHeading: string;
  servicesSubheading: string;
  footerTagline: string;
  footerCopyright: string;
  newsletterHeading: string;
  newsletterDescription: string;
  // Sub-page copy
  naturePageEyebrow: string;
  naturePageHeading: string;
  naturePageSubheading: string;
  energyPageEyebrow: string;
  energyPageHeading: string;
  energyPageSubheading: string;
  energyPageEmptyState: string;
  storiesPageEyebrow: string;
  storiesPageHeading: string;
  storiesPageSubheading: string;
  storiesPageNepaliCouplet: string;
  contactHeading: string;
  contactSubheading: string;
  contactResponseNote: string;
}

export type HomeCopy = WithNepali<HomeCopyBase>;

export const DEFAULT_HOME_COPY: HomeCopy = {
  heroEyebrow: "Kathmandu, Nepal",
  heroTitle: "Curated in Kathmandu. From the world. For the world.",
  heroSubtitle:
    "Everything in nature carries energy. Discover yours.",
  heroCtaLabel: "Explore the elements",
  heroCtaHref: "/nature",
  brandStripLines: [
    "Curated in Kathmandu",
    "From the world",
    "For the world",
  ],
  brandStripCards: [
    {
      title: "Our Lens, Not Our Limit",
      body: "We curate beyond Nepal — sourcing the right object from the right place, regardless of border.",
    },
    {
      title: "Sourced Globally. Served Globally.",
      body: "Four showrooms in Kathmandu. WhatsApp delivery anywhere a parcel can travel.",
    },
    {
      title: "Rooted in Respect",
      body: "Short chains, fair prices, and the patience that good objects deserve.",
    },
  ],
  elementsHeading: "The six elements",
  elementsSubheading: "Everything in nature carries energy.",
  categoriesEyebrow: "Browse Categories",
  categoriesHeading: "Shop by category",
  categoriesSubheading: "",
  newReleasesEyebrow: "New Releases",
  newReleasesHeading: "Newly arrived this season",
  newReleasesSubheading: "",
  featuredProductsEyebrow: "Featured",
  featuredProductsHeading: "Featured this month",
  featuredProductsSubheading: "",
  featuredStoryEyebrow: "Shaman Stories",
  featuredStoryHeading: "The latest stories",
  featuredStorySubheading:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the wisdom of nature.",
  servicesEyebrow: "Energy Services",
  servicesHeading: "Sit, breathe, be sound",
  servicesSubheading:
    "Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine.",
  footerTagline:
    "Curated in Kathmandu. From the world. For the world. Four showrooms across the valley.",
  footerCopyright: "Shaman Kathmandu",
  newsletterHeading: "Stay in touch",
  newsletterDescription:
    "Notes from the showroom, new arrivals, occasional letters.",
  naturePageEyebrow: "Nature",
  naturePageHeading: "Six elements, one curation",
  naturePageSubheading:
    "Wood, water, metal, earth, plant, and air — every object on this page is shaped by one of these.",
  energyPageEyebrow: "Energy",
  energyPageHeading: "Sit, breathe, be sound",
  energyPageSubheading:
    "Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine.",
  energyPageEmptyState: "No energy services scheduled at the moment. Please check back soon.",
  storiesPageEyebrow: "Shaman Stories",
  storiesPageHeading: "A return to the elements",
  storiesPageSubheading:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the wisdom of nature.",
  storiesPageNepaliCouplet: "शक्ति बाहिर होइन।\nयही सृष्टिभित्र छ।",
  contactHeading: "Visit a showroom, or WhatsApp us.",
  contactSubheading: "We answer most messages the same day.",
  contactResponseNote:
    "Most enquiries are answered the same day. For pieces that ship internationally we will quote you on a parcel-by-parcel basis.",
  // ── Nepali defaults (shown on /ne; editable per-field in /sysuser/site) ──
  heroEyebrowNe: "काठमाडौँ, नेपाल",
  heroTitleNe: "काठमाडौँमा छानिएको। संसारबाट। संसारका लागि।",
  heroSubtitleNe: "प्रकृतिमा भएको हरेक कुराले ऊर्जा बोक्छ। आफ्नो ऊर्जा पत्ता लगाउनुहोस्।",
  heroCtaLabelNe: "तत्वहरू अन्वेषण गर्नुहोस्",
  brandStripLinesNe: ["काठमाडौँमा छानिएको", "संसारबाट", "संसारका लागि"],
  brandStripCardsNe: [
    {
      title: "हाम्रो दृष्टिकोण, हाम्रो सीमा होइन",
      body: "हामी नेपालभन्दा बाहिर पनि छनोट गर्छौं — सिमानाको पर्वाह नगरी सही ठाउँबाट सही वस्तु ल्याउँछौं।",
    },
    {
      title: "विश्वभरबाट। विश्वभरि।",
      body: "काठमाडौँमा चार शोरूम। प्यार्सल पुग्ने जुनसुकै ठाउँमा ह्वाट्सएप मार्फत डेलिभरी।",
    },
    {
      title: "सम्मानमा जरा गाडिएको",
      body: "छोटो आपूर्ति शृंखला, उचित मूल्य, र राम्रा वस्तुले पाउनुपर्ने धैर्य।",
    },
  ],
  elementsHeadingNe: "छ तत्वहरू",
  elementsSubheadingNe: "प्रकृतिमा भएको हरेक कुराले ऊर्जा बोक्छ।",
  categoriesEyebrowNe: "श्रेणीहरू हेर्नुहोस्",
  categoriesHeadingNe: "श्रेणी अनुसार किनमेल",
  newReleasesEyebrowNe: "नयाँ आगमन",
  newReleasesHeadingNe: "यस मौसममा भर्खरै आइपुगेका",
  featuredProductsEyebrowNe: "विशेष",
  featuredProductsHeadingNe: "यस महिनाको विशेष",
  featuredStoryEyebrowNe: "शमन कथाहरू",
  featuredStoryHeadingNe: "पछिल्ला कथाहरू",
  featuredStorySubheadingNe:
    "तत्वहरू, अदृश्य शक्तिहरू, र प्रकृतिको ज्ञानभित्र शमन काठमाडौँको यात्रा।",
  servicesEyebrowNe: "ऊर्जा सेवाहरू",
  servicesHeadingNe: "बस्नुहोस्, सास फेर्नुहोस्, ध्वनिमय हुनुहोस्",
  servicesSubheadingNe:
    "ध्वनि उपचार, श्वास अभ्यास, र विस्तारै निर्देशित अभ्यास — हाम्रा शोरूममा वा सहरमाथि सल्लाको छहारीमा।",
  footerTaglineNe:
    "काठमाडौँमा छानिएको। संसारबाट। संसारका लागि। उपत्यकाभरि चार शोरूम।",
  footerCopyrightNe: "शमन काठमाडौँ",
  newsletterHeadingNe: "सम्पर्कमा रहनुहोस्",
  newsletterDescriptionNe: "शोरूमका कुरा, नयाँ आगमन, कहिलेकाहीँका पत्रहरू।",
  naturePageEyebrowNe: "प्रकृति",
  naturePageHeadingNe: "छ तत्व, एउटै छनोट",
  naturePageSubheadingNe:
    "काठ, पानी, धातु, पृथ्वी, वनस्पति, र हावा — यस पृष्ठको हरेक वस्तु यिनैमध्ये कुनै एकबाट आकार पाएको हो।",
  energyPageEyebrowNe: "ऊर्जा",
  energyPageHeadingNe: "बस्नुहोस्, सास फेर्नुहोस्, ध्वनिमय हुनुहोस्",
  energyPageSubheadingNe:
    "ध्वनि उपचार, श्वास अभ्यास, र विस्तारै निर्देशित अभ्यास — हाम्रा शोरूममा वा सहरमाथि सल्लाको छहारीमा।",
  energyPageEmptyStateNe:
    "अहिले कुनै ऊर्जा सेवा तय गरिएको छैन। कृपया केही समयपछि फेरि हेर्नुहोस्।",
  storiesPageEyebrowNe: "शमन कथाहरू",
  storiesPageHeadingNe: "तत्वहरूतर्फ फिर्ती",
  storiesPageSubheadingNe:
    "तत्वहरू, अदृश्य शक्तिहरू, र प्रकृतिको ज्ञानभित्र शमन काठमाडौँको यात्रा।",
  contactHeadingNe: "शोरूम भ्रमण गर्नुहोस्, वा हामीलाई ह्वाट्सएप गर्नुहोस्।",
  contactSubheadingNe: "हामी प्रायः सन्देशको जवाफ सोही दिन दिन्छौं।",
  contactResponseNoteNe:
    "प्रायः सोधपुछको जवाफ सोही दिन दिइन्छ। अन्तर्राष्ट्रिय रूपमा पठाइने वस्तुहरूका लागि हामी प्रत्येक प्यार्सलअनुसार मूल्य बताउनेछौं।",
};

export interface BrandingExtras {
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
}

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

export interface SocialLink {
  key: string; // e.g. instagram, facebook, tiktok, whatsapp, youtube
  label: string;
  href: string;
}

interface NavConfigBase {
  /** Logo wrapper link (header + footer). */
  logoHref: string;
  /** Primary header navigation. */
  headerLinks: NavLink[];
  /** Header right-side action labels. Hide one by setting label to "". */
  headerLoginLabel: string;
  headerLoginHref: string;
  headerSearchHref: string;
  headerWishlistHref: string;
  /** Footer columns (heading + links). */
  footerColumns: FooterColumn[];
  /** Bottom-of-footer legal links. */
  footerLegalLinks: NavLink[];
  /** Quote / paragraph rendered above the legal row. */
  footerQuote: string;
  /** Social icons in the footer. */
  footerSocials: SocialLink[];
  /** Hero buttons + scroll indicator on the home page. */
  heroPrimaryCta: NavLink;
  heroSecondaryCta: NavLink;
  heroScrollHref: string;
  /** "View all" buttons on the home page sections. */
  newReleasesAllCta: NavLink;
  servicesAllCta: NavLink;
  storiesAllCta: NavLink;
  /** Reusable CTA labels that surface on cards / detail pages. */
  ctaProductEnquireLabel: string;
  ctaWhatsappFloatLabel: string;
  ctaNewsletterButtonLabel: string;
}

export type NavConfig = WithNepali<NavConfigBase>;

export const DEFAULT_NAV_CONFIG: NavConfig = {
  logoHref: "/",
  heroPrimaryCta: { label: "Explore Nature", href: "/nature" },
  heroSecondaryCta: { label: "Book Energy", href: "/energy" },
  heroScrollHref: "/stories",
  newReleasesAllCta: { label: "Browse All Nature", href: "/nature" },
  servicesAllCta: { label: "Explore All Services", href: "/energy" },
  storiesAllCta: { label: "View All Stories", href: "/stories" },
  headerLinks: [
    { label: "Home", href: "/" },
    { label: "Nature", href: "/nature" },
    { label: "Energy", href: "/energy" },
    { label: "Our Products", href: "/products" },
    { label: "Shaman Stories", href: "/stories" },
  ],
  headerLoginLabel: "Login",
  headerLoginHref: "/account/login",
  headerSearchHref: "/search",
  headerWishlistHref: "/account/wishlist",
  footerColumns: [
    {
      heading: "Explore",
      links: [
        { label: "Nature", href: "/nature" },
        { label: "Energy Services", href: "/energy" },
        { label: "Shaman Stories", href: "/stories" },
        { label: "Bundles", href: "/bundles" },
      ],
    },
    {
      heading: "Support",
      links: [
        { label: "About", href: "/pages/about" },
        { label: "FAQ", href: "/pages/faq" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  footerLegalLinks: [
    { label: "Privacy", href: "/pages/privacy" },
    { label: "Terms", href: "/pages/terms" },
  ],
  footerQuote: "Nature does not carry a passport. Neither do we.",
  footerSocials: [
    { key: "instagram", label: "Instagram", href: "" },
    { key: "tiktok", label: "TikTok", href: "" },
    { key: "facebook", label: "Facebook", href: "" },
    { key: "youtube", label: "YouTube", href: "" },
    { key: "whatsapp", label: "WhatsApp", href: "" },
  ],
  ctaProductEnquireLabel: "Enquire on WhatsApp",
  ctaWhatsappFloatLabel: "Enquire",
  ctaNewsletterButtonLabel: "Subscribe",
  // ── Nepali defaults (shown on /ne; editable in /sysuser/site) ──
  heroPrimaryCtaNe: { label: "प्रकृति अन्वेषण", href: "/nature" },
  heroSecondaryCtaNe: { label: "ऊर्जा बुक गर्नुहोस्", href: "/energy" },
  newReleasesAllCtaNe: { label: "सबै प्रकृति हेर्नुहोस्", href: "/nature" },
  servicesAllCtaNe: { label: "सबै सेवा हेर्नुहोस्", href: "/energy" },
  storiesAllCtaNe: { label: "सबै कथा हेर्नुहोस्", href: "/stories" },
  headerLinksNe: [
    { label: "गृहपृष्ठ", href: "/" },
    { label: "प्रकृति", href: "/nature" },
    { label: "ऊर्जा", href: "/energy" },
    { label: "हाम्रा उत्पादनहरू", href: "/products" },
    { label: "शमन कथाहरू", href: "/stories" },
  ],
  headerLoginLabelNe: "लगइन",
  footerColumnsNe: [
    {
      heading: "अन्वेषण",
      links: [
        { label: "प्रकृति", href: "/nature" },
        { label: "ऊर्जा सेवाहरू", href: "/energy" },
        { label: "शमन कथाहरू", href: "/stories" },
        { label: "बन्डलहरू", href: "/bundles" },
      ],
    },
    {
      heading: "सहयोग",
      links: [
        { label: "हाम्रोबारे", href: "/pages/about" },
        { label: "प्रश्नोत्तर", href: "/pages/faq" },
        { label: "सम्पर्क", href: "/contact" },
      ],
    },
  ],
  footerLegalLinksNe: [
    { label: "गोपनीयता", href: "/pages/privacy" },
    { label: "सर्तहरू", href: "/pages/terms" },
  ],
  footerQuoteNe: "प्रकृतिसँग राहदानी हुँदैन। हामीसँग पनि छैन।",
  ctaProductEnquireLabelNe: "ह्वाट्सएपमा सोध्नुहोस्",
  ctaWhatsappFloatLabelNe: "सोध्नुहोस्",
  ctaNewsletterButtonLabelNe: "सदस्यता लिनुहोस्",
};

export const getHomeCopy = unstable_cache(
  async (): Promise<HomeCopy> => {
    try {
      const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const stored =
        row?.data && typeof row.data === "object" && "homeCopy" in row.data
          ? ((row.data as { homeCopy?: Partial<HomeCopy> }).homeCopy ?? {})
          : {};
      return { ...DEFAULT_HOME_COPY, ...stored };
    } catch {
      return DEFAULT_HOME_COPY;
    }
  },
  ["site-home-copy"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);

export const getNavConfig = unstable_cache(
  async (): Promise<NavConfig> => {
    try {
      const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const stored =
        row?.data && typeof row.data === "object" && "nav" in row.data
          ? ((row.data as { nav?: Partial<NavConfig> }).nav ?? {})
          : {};
      // Shallow merge — arrays in `stored` fully replace defaults so editors
      // can drop default links by saving an empty array.
      return { ...DEFAULT_NAV_CONFIG, ...stored } as NavConfig;
    } catch {
      return DEFAULT_NAV_CONFIG;
    }
  },
  ["site-nav-config"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);

export const getBrandingExtras = unstable_cache(
  async (): Promise<BrandingExtras> => {
    try {
      const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const data = (row?.data ?? {}) as {
        branding?: { logoUrl?: string; faviconUrl?: string };
        seo?: { ogImage?: string };
      };
      return {
        logoUrl: data.branding?.logoUrl ?? "",
        faviconUrl: data.branding?.faviconUrl ?? "",
        ogImageUrl: data.seo?.ogImage ?? "",
      };
    } catch {
      return { logoUrl: "", faviconUrl: "", ogImageUrl: "" };
    }
  },
  ["site-branding-extras"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);
