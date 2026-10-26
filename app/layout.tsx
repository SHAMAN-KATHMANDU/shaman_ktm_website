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
import { META_PIXEL_ID_DEFAULT } from "@/lib/env";
import { PixelRouteEvents } from "@/components/site/layout/pixel-route-events";
import { ClickTracking } from "@/components/site/layout/click-tracking";
import { ScrollToTopOnNavigate } from "@/components/site/scroll-to-top";
import { siteUrl } from "@/lib/site-url";
import { getBrandingExtras } from "@/lib/site-content";
import { localeFromValue, LOCALE_HEADER } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

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
// is overridable to a test pixel without a rebuild).
//
// Read from process.env rather than the validating `env` proxy: this is the
// root layout, so it sits in every page's module graph. Touching `env` here
// forces full-schema validation during `next build`'s page-data collection,
// where DATABASE_URL and SESSION_PASSWORD don't exist — which broke the Docker
// image build. The full schema is still validated at server boot by
// instrumentation.ts, so a real misconfiguration still fails the container
// immediately.
const META_PIXEL_ID =
  process.env.META_PIXEL_ID?.trim() || META_PIXEL_ID_DEFAULT;

// Fallback for pages that set no title of their own; the home page sets the
// same copy (localized) via t.seo.home.
const LIVE_TITLE = getDictionary("en").seo.home.title;
const LIVE_DESC = getDictionary("en").seo.home.description;
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

  // Search Console / Bing ownership tokens. Read straight from process.env,
  // not loadEnv(): this also runs when the build prerenders the not-found
  // page, and loadEnv() throws on required vars a Docker build stage lacks.
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  const verification = {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };

  return {
    title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
    description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
    metadataBase: new URL(SITE_URL),
    ...(customFavicon ? { icons: customFavicon } : {}),
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
    openGraph: {
      title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
      description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
      type: "website",
      siteName: "Shaman Kathmandu",
      images: [branding.ogImageUrl || `${SITE_URL}/og-default.jpg`],
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
  // have no prefix and resolve to "en". It also sets `x-pathname` for /upload routes.
  const h = await headers();
  const locale = localeFromValue(h.get(LOCALE_HEADER));
  const pathname = h.get("x-pathname") || "";
  const isUpload = pathname.startsWith("/upload/") || pathname === "/upload";
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      // Next 16 stopped overriding CSS smooth-scroll during SPA navigations,
      // so route changes animated from the old scroll position and settled
      // mid-page. This attribute restores instant scroll-to-top on navigation
      // while keeping smooth scrolling for in-page anchors.
      data-scroll-behavior="smooth"
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
        {!IS_COMING_SOON && !isUpload && (
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
            <ClickTracking />
          </>
        )}
        <ScrollToTopOnNavigate />
        {children}
      </body>
    </html>
  );
}
