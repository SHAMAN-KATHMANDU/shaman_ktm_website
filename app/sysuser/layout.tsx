import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shaman CMS",
  robots: { index: false, follow: false },
};

export default function SysuserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // .sysuser-theme re-pins the legacy dark tokens the admin still uses
  // while the storefront runs the light Trinity theme (see globals.css);
  // removed when the admin gets its own retheme.
  return <div className="sysuser-theme min-h-screen">{children}</div>;
}
