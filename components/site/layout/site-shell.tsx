import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";
import { getNavConfig } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";

export async function SiteShell({ children }: { children: ReactNode }) {
  const [nav, modules] = await Promise.all([
    getNavConfig(),
    getSiteModules(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)]">
      <Header nav={nav} />
      <main className="flex-1">{children}</main>
      <Footer nav={nav} />
      {modules.whatsappFloat && (
        <WhatsAppFloat label={nav.ctaWhatsappFloatLabel} />
      )}
    </div>
  );
}
