import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import "./globals.css";

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

const SITE_URL = "https://shamankathmandu.com";

export const metadata: Metadata = {
  title: "Shaman Kathmandu | Under construction",
  description:
    "Shaman Kathmandu — our new website is on the way. Contact us by email or phone.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Shaman Kathmandu | Under construction",
    description:
      "Our new website is on the way. Reach us via email or phone in the meantime.",
    type: "website",
  },
};

export const viewport: Viewport = {
  /* Matches hero mid-tone (--uc-bg-d) */
  themeColor: "#5e8872",
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
      className={`${fontDisplay.variable} ${fontBody.variable}`}
    >
      <body className="min-h-screen antialiased font-sans-uc">{children}</body>
    </html>
  );
}
