import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";
import { AnnouncementBar } from "./announcement-bar";
import { getNavConfig } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";
import { listShowrooms } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Showroom } from "@/lib/api/types";

async function loadAnnouncement() {
  try {
    return await prisma.announcement.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

export async function SiteShell({ children }: { children: ReactNode }) {
  const [nav, modules, showrooms, announcement] = await Promise.all([
    getNavConfig(),
    getSiteModules(),
    listShowrooms().catch((): Showroom[] => []),
    loadAnnouncement(),
  ]);

  // Module flag gates the bar entirely; the row's `enabled` flag gates the
  // current message.
  const showAnnouncement =
    modules.announcementBar && announcement?.enabled && announcement.message;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)]">
      {showAnnouncement && announcement && (
        <AnnouncementBar
          announcement={{
            enabled: announcement.enabled,
            message: announcement.message,
            href: announcement.href,
            bgColor: announcement.bgColor,
            fgColor: announcement.fgColor,
            dismissable: announcement.dismissable,
          }}
        />
      )}
      <Header nav={nav} />
      <main className="flex-1">{children}</main>
      <Footer nav={nav} showrooms={showrooms} />
      {modules.whatsappFloat && (
        <WhatsAppFloat label={nav.ctaWhatsappFloatLabel} />
      )}
    </div>
  );
}
