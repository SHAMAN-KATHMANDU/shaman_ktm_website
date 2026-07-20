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

export interface HeroStat {
  value: string; // "200+"
  label: string; // "curated pieces"
}

// English-only base shape. The exported `HomeCopy` adds an optional `<field>Ne`
// twin for every key (see `WithNepali`), so a row may carry Nepali copy.
interface HomeCopyBase {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroStats: HeroStat[];
  heroChipTopLeft: string;
  heroChipBottomRight: string;
  brandStripLines: string[];
  brandStripCards: BrandStripCard[];
  taglineQuote: string;
  taglineSubline: string;
  offersEyebrow: string;
  offersHeading: string;
  campaignEyebrow: string;
  campaignHeading: string;
  campaignBlurb: string;
  campaignNote: string;
  campaignMemberPricePrefix: string;
  campaignCtaLabel: string;
  clearanceEyebrow: string;
  clearanceHeading: string;
  clearanceBlurb: string;
  clearanceNote: string;
  clearancePercentPrefix: string;
  trustItems: BrandStripCard[];
  whoEyebrow: string;
  whoHeading: string;
  whoParagraphs: string[];
  whoPassportQuote: string;
  whoCtaLabel: string;
  whoWhatsappNote: string;
  memberCircleEyebrow: string;
  memberCircleHeading: string;
  memberCircleLede: string;
  memberCircleBenefits: string[];
  memberCircleFormHeading: string;
  memberCircleFormDescription: string;
  memberCircleNameLabel: string;
  memberCircleWhatsappLabel: string;
  memberCircleButtonLabel: string;
  memberCircleFinePrint: string;
  memberCircleSuccessHeading: string;
  memberCircleSuccessMessage: string;
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
  bundlesPageEyebrow: string;
  bundlesPageHeading: string;
  bundlesPageSubheading: string;
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
  heroStats: [
    { value: "200+", label: "curated pieces" },
    { value: "6", label: "elements of nature" },
    { value: "4", label: "showrooms in the valley" },
  ],
  heroChipTopLeft: "Metal · Sound Healing",
  heroChipBottomRight: "Tuned by ear",
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
  taglineQuote: "Curated in Kathmandu. From the world. For the world.",
  taglineSubline: "Nature does not carry a passport · Neither do we",
  offersEyebrow: "This season",
  offersHeading: "The offers",
  campaignEyebrow: "Shrawan · Jul 17 – Aug 17",
  campaignHeading: "The month of green & silver",
  campaignBlurb:
    "Shrawan is when the valley turns green and wrists turn to bangles. For the whole month, every piece of jewelry carries the seasonal offer — and Member Circle wrists carry double.",
  campaignNote:
    "Offer shown as struck-through price → offer price. Member price unlocked with your member name or number.",
  campaignMemberPricePrefix: "Members",
  campaignCtaLabel: "Shop the full collection",
  clearanceEyebrow: "Final sale · While they last",
  clearanceHeading: "The clearance edit",
  clearanceBlurb:
    "Last pieces from earlier collections — display sets, single pieces, retired lines. Final sale, exchange only per policy.",
  clearanceNote:
    "The clearance list is refreshed as pieces sell out — when they're gone, they're gone.",
  clearancePercentPrefix: "Up to",
  trustItems: [
    {
      title: "Sourced short",
      body: "We source where we can, we make where we can't — and we keep the chain between maker and your hands as short as possible.",
    },
    {
      title: "Priced honest",
      body: "No tourist pricing, no inflated \"handicraft\" markups. One honest price, in rupees, member discounts on top.",
    },
    {
      title: "Answered same-day",
      body: "Every product page has a WhatsApp line to a real person in a real showroom. Most enquiries answered the same day.",
    },
  ],
  whoEyebrow: "Who we are",
  whoHeading: "A small showroom group with a long reach",
  whoParagraphs: [
    "Shaman Kathmandu is a small showroom group in Kathmandu and Lalitpur. We curate objects and services around six elements of nature — metal, earth, wood, plant, water, air — sourced from Nepal, India, Indonesia, and wherever the element leads us.",
    "We are not a souvenir shop. We are curators: every bowl is struck, every statue turned over, every strand of beads worn before it earns a place on the shelf.",
  ],
  whoPassportQuote: "\"Nature does not carry a passport. Neither do we.\"",
  whoCtaLabel: "Read our full story",
  whoWhatsappNote:
    "WhatsApp the showroom closest to you before you head over. Most enquiries are answered the same day.",
  memberCircleEyebrow: "Shaman Member Circle",
  memberCircleHeading: "Unlock the inner circle",
  memberCircleLede:
    "Free to join for anyone who has shopped with us for NPR 1,500 or more. Members carry a physical card — and every offer on this page gets better with it.",
  memberCircleBenefits: [
    "Member-only discounts — up to 2× every public offer",
    "First access to new & limited collections",
    "Weekly member offers, announced Fridays",
    "Invitations to events, previews & live sessions",
    "Seasonal gifts and surprises",
    "Priority support on WhatsApp & in showrooms",
  ],
  memberCircleFormHeading: "Join the Circle",
  memberCircleFormDescription:
    "Leave your name and WhatsApp number — we'll send the registration form and activate you within 24 hours.",
  memberCircleNameLabel: "Your name",
  memberCircleWhatsappLabel: "WhatsApp number",
  memberCircleButtonLabel: "Request my member card",
  memberCircleFinePrint:
    "Free · No spam — member offers and early previews only · Opt out anytime",
  memberCircleSuccessHeading: "नमस्ते 🙏",
  memberCircleSuccessMessage:
    "Thank you — we've noted your details. Watch WhatsApp for your registration form; your card follows in 7–10 working days.",
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
  bundlesPageEyebrow: "Bundles",
  bundlesPageHeading: "Three or more, at the same time",
  bundlesPageSubheading:
    "Curated sets across the elements — each one priced below the sum of its parts.",
  contactHeading: "Visit a showroom, or WhatsApp us.",
  contactSubheading: "We answer most messages the same day.",
  contactResponseNote:
    "Most enquiries are answered the same day. For pieces that ship internationally we will quote you on a parcel-by-parcel basis.",
  // ── Nepali defaults (shown on /ne; editable per-field in /sysuser/site) ──
  heroEyebrowNe: "काठमाडौँ, नेपाल",
  heroTitleNe: "काठमाडौँमा छानिएको। संसारबाट। संसारकै लागि।",
  heroSubtitleNe: "प्रकृतिमा भएको हरेक कुराले ऊर्जा बोक्छ। आफ्नो ऊर्जा पत्ता लगाउनुहोस्।",
  heroCtaLabelNe: "तत्वहरू अन्वेषण गर्नुहोस्",
  heroStatsNe: [
    { value: "२००+", label: "छानिएका वस्तुहरू" },
    { value: "६", label: "प्रकृतिका तत्वहरू" },
    { value: "४", label: "उपत्यकाभरि शोरूम" },
  ],
  heroChipTopLeftNe: "धातु · ध्वनि उपचार",
  heroChipBottomRightNe: "कानले मिलाइएको",
  taglineQuoteNe: "काठमाडौँमा छानिएको। संसारबाट। संसारका लागि।",
  taglineSublineNe: "प्रकृतिसँग राहदानी हुँदैन · हामीसँग पनि छैन",
  offersEyebrowNe: "यस मौसममा",
  offersHeadingNe: "अफरहरू",
  campaignEyebrowNe: "श्रावण",
  campaignHeadingNe: "हरियाली र चाँदीको महिना",
  campaignBlurbNe:
    "श्रावणमा उपत्यका हरियो हुन्छ र नाडीमा चुरा चढ्छन्। महिनाभरि हरेक गहनामा मौसमी छुट — र मेम्बर सर्कलका सदस्यलाई दोब्बर।",
  campaignNoteNe:
    "काटिएको मूल्य → अफर मूल्य देखाइएको छ। सदस्य मूल्य आफ्नो सदस्य नाम वा नम्बरबाट खुल्छ।",
  campaignMemberPricePrefixNe: "सदस्यहरूलाई",
  campaignCtaLabelNe: "पूरा संग्रह हेर्नुहोस्",
  clearanceEyebrowNe: "अन्तिम बिक्री · सकिनु अघि",
  clearanceHeadingNe: "क्लियरेन्स संग्रह",
  clearanceBlurbNe:
    "अघिल्ला संग्रहका अन्तिम वस्तुहरू — डिस्प्ले सेट, एकल वस्तु, बन्द भएका लाइनहरू। अन्तिम बिक्री, नीतिअनुसार साटफेर मात्र।",
  clearanceNoteNe:
    "वस्तु बिक्दै जाँदा क्लियरेन्स सूची अद्यावधिक हुन्छ — सकिएपछि फेरि आउँदैन।",
  clearancePercentPrefixNe: "सम्म",
  trustItemsNe: [
    {
      title: "छोटो आपूर्ति",
      body: "सक्ने ठाउँबाट ल्याउँछौं, नसक्ने बनाउँछौं — र निर्माता र तपाईंको हातबीचको दूरी सकेसम्म छोटो राख्छौं।",
    },
    {
      title: "इमानदार मूल्य",
      body: "पर्यटक मूल्य छैन, बढाइएको मूल्य छैन। रुपैयाँमा एउटै इमानदार मूल्य, माथि सदस्य छुट।",
    },
    {
      title: "सोही दिन जवाफ",
      body: "हरेक उत्पादन पृष्ठमा वास्तविक शोरूमको वास्तविक व्यक्तिसम्म पुग्ने ह्वाट्सएप लाइन छ। प्रायः सोधपुछको जवाफ सोही दिन।",
    },
  ],
  whoEyebrowNe: "हामी को हौं",
  whoHeadingNe: "लामो पहुँच भएको सानो शोरूम समूह",
  whoParagraphsNe: [
    "शमन काठमाडौँ काठमाडौँ र ललितपुरको सानो शोरूम समूह हो। हामी प्रकृतिका छ तत्व — धातु, पृथ्वी, काठ, वनस्पति, जल, वायु — वरिपरि वस्तु र सेवाहरू छनोट गर्छौं; नेपाल, भारत, इन्डोनेसिया र तत्वले पुर्‍याउने जुनसुकै ठाउँबाट।",
    "हामी स्मारिका पसल होइनौं। हामी क्युरेटर हौं: हरेक बाटा बजाइन्छ, हरेक मूर्ति पल्टाइन्छ, हरेक मालाको लहर लगाएर हेरिन्छ — अनि मात्र त्यसले तख्तामा ठाउँ पाउँछ।",
  ],
  whoPassportQuoteNe: "\"प्रकृतिसँग राहदानी हुँदैन। हामीसँग पनि छैन।\"",
  whoCtaLabelNe: "हाम्रो पूरा कथा पढ्नुहोस्",
  whoWhatsappNoteNe:
    "आउनु अघि आफ्नो नजिकको शोरूमलाई ह्वाट्सएप गर्नुहोस्। प्रायः सोधपुछको जवाफ सोही दिन दिइन्छ।",
  memberCircleEyebrowNe: "शमन सदस्य मण्डल",
  memberCircleHeadingNe: "भित्री मण्डल खोल्नुहोस्",
  memberCircleLedeNe:
    "रु. १,५०० वा बढीको किनमेल गर्नुभएका जोकोहीका लागि निःशुल्क। सदस्यहरूसँग भौतिक कार्ड हुन्छ — र यस पृष्ठको हरेक अफर त्यससँगै अझ राम्रो हुन्छ।",
  memberCircleBenefitsNe: [
    "सदस्य-मात्र छुट — हरेक सार्वजनिक अफरको २ गुणासम्म",
    "नयाँ र सीमित संग्रहमा पहिलो पहुँच",
    "हरेक शुक्रबार घोषणा हुने साप्ताहिक सदस्य अफर",
    "कार्यक्रम, पूर्वावलोकन र लाइभ सत्रका निम्तो",
    "मौसमी उपहार र आश्चर्यहरू",
    "ह्वाट्सएप र शोरूममा प्राथमिकता सहयोग",
  ],
  memberCircleFormHeadingNe: "मण्डलमा सामेल हुनुहोस्",
  memberCircleFormDescriptionNe:
    "आफ्नो नाम र ह्वाट्सएप नम्बर छोड्नुहोस् — हामी दर्ता फारम पठाउनेछौं र २४ घण्टाभित्र सक्रिय गर्नेछौं।",
  memberCircleNameLabelNe: "तपाईंको नाम",
  memberCircleWhatsappLabelNe: "ह्वाट्सएप नम्बर",
  memberCircleButtonLabelNe: "मेरो सदस्य कार्ड माग्नुहोस्",
  memberCircleFinePrintNe:
    "निःशुल्क · स्प्याम छैन — सदस्य अफर र अग्रिम झलक मात्र · जुनसुकै बेला बाहिरिन सकिन्छ",
  memberCircleSuccessHeadingNe: "नमस्ते 🙏",
  memberCircleSuccessMessageNe:
    "धन्यवाद — तपाईंको विवरण टिपेका छौं। दर्ता फारमका लागि ह्वाट्सएप हेर्नुहोस्; कार्ड ७–१० कार्य दिनभित्र आउँछ।",
  bundlesPageEyebrowNe: "बन्डलहरू",
  bundlesPageHeadingNe: "तीन वा बढी, एकैसाथ",
  bundlesPageSubheadingNe:
    "तत्वहरूभरिका छानिएका सेटहरू — हरेकको मूल्य छुट्टाछुट्टै किन्दाभन्दा कम।",
  brandStripLinesNe: ["काठमाडौँमा छानिएको", "संसारबाट", "संसारकै लागि"],
  brandStripCardsNe: [
    {
      title: "नेपाल हाम्रो जरा हो, घेरा होइन",
      body: "हामी नेपालमा मात्र सीमित छैनौं — सिमानाको पर्वाह नगरी सही ठाउँबाट सही वस्तु ल्याउँछौं।",
    },
    {
      title: "संसारभरिबाट संकलन, संसारभरि सेवा।",
      body: "काठमाडौँमा चार शोरूम। जहाँसुकै पार्सल पुग्छ, यहीँ WhatsApp मार्फत डेलिभरी।",
    },
    {
      title: "सम्मानमा जरा गाडिएको",
      body: "छोटो आपूर्ति शृंखला, उचित मूल्य, र राम्रा वस्तुले पाउनुपर्ने धैर्य।",
    },
  ],
  elementsHeadingNe: "प्रकृतिका छ तत्त्व",
  elementsSubheadingNe: "प्रकृतिमा भएको हरेक कुराले ऊर्जा बोक्छ।",
  categoriesEyebrowNe: "श्रेणीहरू हेर्नुहोस्",
  categoriesHeadingNe: "श्रेणी अनुसार किनमेल",
  newReleasesEyebrowNe: "नयाँ सामान",
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
    "ध्वनि उपचार, श्वास अभ्यास, र बिस्तारै निर्देशित अभ्यास — हाम्रा शोरूममा वा सहरमाथि सल्लाको छहारीमा।",
  footerTaglineNe:
    "काठमाडौँमा छानिएको। संसारबाट। संसारकै लागि। उपत्यकाभरि फैलिएका चार शोरूमहरू।",
  footerCopyrightNe: "शमन काठमाडौँ",
  newsletterHeadingNe: "सम्पर्कमा रहनुहोस्",
  newsletterDescriptionNe: "शोरूमका कुरा, नयाँ आगमन, कहिलेकाहीँका पत्रहरू।",
  naturePageEyebrowNe: "प्रकृति",
  naturePageHeadingNe: "छ तत्व, एउटै छनोट",
  naturePageSubheadingNe:
    "काठ, पानी, धातु, पृथ्वी, बिरुवा, र हावा — यस पृष्ठको हरेक वस्तु यिनैमध्ये कुनै एकबाट आकार पाएको हो।",
  energyPageEyebrowNe: "ऊर्जा",
  energyPageHeadingNe: "बस्नुहोस्, सास फेर्नुहोस्, ध्वनिमय हुनुहोस्",
  energyPageSubheadingNe:
    "ध्वनि उपचार, श्वास अभ्यास, र बिस्तारै निर्देशित अभ्यास — हाम्रा शोरूममा वा सहरमाथि सल्लाको छहारीमा।",
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
  heroPrimaryCtaNe: { label: "प्रकृति अन्वेषण गर्नुहोस्", href: "/nature" },
  heroSecondaryCtaNe: { label: "ऊर्जा सेवा बुक गर्नुहोस्", href: "/energy" },
  newReleasesAllCtaNe: { label: "प्रकृतिका सबै सामान हेर्नुहोस्", href: "/nature" },
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
      heading: "अन्वेषण गर्नुहोस्",
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
  ctaProductEnquireLabelNe: "WhatsApp मार्फत सोध्नुहोस्",
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
