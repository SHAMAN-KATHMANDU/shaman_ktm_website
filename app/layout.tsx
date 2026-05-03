import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { getBrandingExtras } from "@/lib/site-content";

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = "https://shamankathmandu.com";

const LIVE_TITLE = "Shaman Kathmandu — Nature + Energy";
const LIVE_DESC =
  "Everything in nature carries energy. Singing bowls, dual-element crystal bracelets, hand-carved Ganesh statues, canned Himalayan oxygen, and Tibetan bowl therapy — curated in Kathmandu.";
const COMING_TITLE = "Shaman Kathmandu | Under construction";
const COMING_DESC =
  "Shaman Kathmandu — our new website is on the way. Contact us by email or phone.";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingExtras();
  return {
    title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
    description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
    metadataBase: new URL(SITE_URL),
    icons: {
      icon: branding.faviconUrl || "/favicon.ico",
      shortcut: branding.faviconUrl || "/favicon.ico",
      apple: branding.faviconUrl || "/favicon.ico",
    },
    openGraph: {
      title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
      description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
      type: "website",
      images: branding.ogImageUrl ? [branding.ogImageUrl] : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: IS_COMING_SOON ? "#5e8872" : "#0a0806",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontBody.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
