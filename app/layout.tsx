import type { Metadata, Viewport } from "next";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./globals.css";

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
  themeColor: "#1c2127",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
