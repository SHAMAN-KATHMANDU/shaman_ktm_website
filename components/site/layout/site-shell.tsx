import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";
import { StickyBar } from "./sticky-bar";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="sk-site">
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppFloat />
      <StickyBar />
    </div>
  );
}
