// Render every page on every request. The CMS is the source of truth and we
// don't want stale prerenders ever serving outdated content. Setting it on
// the root layout cascades to every page below.
export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, Mukta } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { env } from "@/lib/env";
import { PixelRouteEvents } from "@/components/site/layout/pixel-route-events";
import { siteUrl } from "@/lib/site-url";
import { getBrandingExtras } from "@/lib/site-content";
import { localeFromValue, LOCALE_HEADER } from "@/lib/i18n/locale";

// The @theme stacks in globals.css compose these three raw families into
// --font-display / --font-body / --font-devanagari. Mukta sits behind DM Sans
// and Cormorant in both stacks so Devanagari glyphs always shape in Mukta
// (Cormorant must never set Devanagari).
const fontCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const fontDmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fontMukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
});

// Canonical origin (shared resolver — see lib/site-url.ts). Set SITE_ORIGIN to
// the www form in production so OG/canonical URLs match the live site.
const SITE_URL = siteUrl;

// Server-rendered into the pixel snippet, so a plain runtime var works (and
// is overridable to a test pixel without a rebuild). Validated in lib/env.ts,
// which also carries the same default.
const META_PIXEL_ID = env.META_PIXEL_ID;

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
  themeColor: IS_COMING_SOON ? "#5e8872" : "#faf9f3",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy sets `x-locale` from the URL (/ne/* → "ne"); admin/API requests
  // have no prefix and resolve to "en".
  const locale = localeFromValue((await headers()).get(LOCALE_HEADER));
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontCormorant.variable} ${fontDmSans.variable} ${fontMukta.variable}`}
    >
      <body className="min-h-screen antialiased">
        {/* Flag JS before paint so scroll-reveal hidden states only apply
            when JS can reveal them (no-JS visitors see content immediately). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {!IS_COMING_SOON && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-ELKPQSLMPS"
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-ELKPQSLMPS');`}
            </Script>
            <PixelRouteEvents />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
