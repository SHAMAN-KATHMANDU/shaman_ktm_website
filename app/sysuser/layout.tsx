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
  return <>{children}</>;
}
