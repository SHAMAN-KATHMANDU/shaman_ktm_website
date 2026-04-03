import type { Metadata, Viewport } from "next";
import { Nunito, Titan_One } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "800"],
  variable: "--font-nunito",
});

const titanOne = Titan_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-titan-one",
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
  themeColor: "#5d9658",
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
      className={`${nunito.variable} ${titanOne.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
