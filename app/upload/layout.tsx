import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Photos",
  robots: { index: false, follow: false },
};

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-bone text-ink">{children}</div>;
}
