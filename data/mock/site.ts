import type { SiteConfig } from "@/lib/api/types";
import { EMAIL, PHONE_DISPLAY } from "@/lib/contact";

export const mockSite: SiteConfig = {
  name: "Shaman Kathmandu",
  tagline: "Curated in Kathmandu. From the world. For the world.",
  branding: {
    logoUrl: "",
    colors: { primary: "#C4A35A", secondary: "#1f180a", accent: "#F5EDD8" },
  },
  themeTokens: {
    mode: "dark",
    typography: {
      fontFamily: "Cormorant Garamond, DM Sans, system-ui, sans-serif",
      baseFontSize: 16,
    },
  },
  contact: {
    email: EMAIL,
    phone: PHONE_DISPLAY,
    address: "Thamel · Jhamsikhel · Gongabu · Kathmandu, Nepal",
    socials: {
      instagram: "@shamankathmandu",
      whatsapp: PHONE_DISPLAY,
      tiktok: "@shamankathmandu",
    },
  },
  seo: {
    title: "Shaman Kathmandu — Nature + Energy",
    description:
      "Everything in nature carries energy. Discover singing bowls, malas, healing crystals, and energy services curated in Kathmandu.",
    ogImage: "",
  },
  currency: "NPR",
  locales: ["en"],
  defaultLocale: "en",
};
