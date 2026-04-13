import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Cormorant_Garamond,
  Montserrat,
  Noto_Sans_Devanagari,
  Source_Sans_3,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { IS_COMING_SOON } from "@/lib/site-mode";

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const fontSiteDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display-site",
  display: "swap",
});

const fontSiteBody = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body-site",
  display: "swap",
});

const fontNp = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-np",
  display: "swap",
});

const SITE_URL = "https://shamankathmandu.com";

const LIVE_TITLE = "Shaman Kathmandu — Handcrafted in the Himalayas";
const LIVE_DESC =
  "Nepal's finest handcrafted jewelry, spiritual items, home decor, and artisan gifts. Shop at our Thamel, Jhamsikhel & Gongabu showrooms or order via WhatsApp.";
const COMING_TITLE = "Shaman Kathmandu | Under construction";
const COMING_DESC =
  "Shaman Kathmandu — our new website is on the way. Contact us by email or phone.";

export const metadata: Metadata = {
  title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
  description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: IS_COMING_SOON ? COMING_TITLE : LIVE_TITLE,
    description: IS_COMING_SOON ? COMING_DESC : LIVE_DESC,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: IS_COMING_SOON ? "#5e8872" : "#3a7a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="forest"
      data-lang="en"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontSiteDisplay.variable} ${fontSiteBody.variable} ${fontNp.variable}`}
    >
      <body className="min-h-screen antialiased font-sans-uc">
        <Script id="sk-lang-pre-paint" strategy="beforeInteractive">
          {`try{var l=localStorage.getItem('sk-lang');if(l==='np'||l==='en'){document.documentElement.setAttribute('data-lang',l);}}catch(_){} `}
        </Script>
        {children}
      </body>
    </html>
  );
}
