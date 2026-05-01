import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
