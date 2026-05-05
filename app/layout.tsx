// Render every page on every request. The CMS is the source of truth and we
// don't want stale prerenders ever serving outdated content. Setting it on
// the root layout cascades to every page below.
export const dynamic = "force-dynamic";

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

function isUsableIconUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingExtras();
  // Only override the file-convention icons (app/favicon.ico, app/icon.png,
  // app/apple-icon.png) when the editor has explicitly set a custom URL in
  // /sysuser/site → branding. Otherwise let Next inject the file-convention
  // links so a misconfigured DB value can never break the favicon.
  const customFavicon = isUsableIconUrl(branding.faviconUrl)
    ? {
        icon: branding.faviconUrl,
        shortcut: branding.faviconUrl,
        apple: branding.faviconUrl,
      }
    : undefined;
  return {
    title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
    description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
    metadataBase: new URL(SITE_URL),
    ...(customFavicon ? { icons: customFavicon } : {}),
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
