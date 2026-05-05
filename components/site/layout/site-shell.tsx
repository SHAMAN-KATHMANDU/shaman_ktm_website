import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppFloat } from "./whatsapp-float";
import { AnnouncementBar } from "./announcement-bar";
import { getNavConfig, getHomeCopy } from "@/lib/site-content";
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
  const [nav, homeCopy, modules, showrooms, announcement] = await Promise.all([
    getNavConfig(),
    getHomeCopy(),
    getSiteModules(),
    listShowrooms().catch((): Showroom[] => []),
    loadAnnouncement(),
  ]);

  const showAnnouncement = announcement?.enabled && announcement.message;

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
      <Footer nav={nav} showrooms={showrooms} homeCopy={homeCopy} />
      {modules.whatsappFloat && (
        <WhatsAppFloat label={nav.ctaWhatsappFloatLabel} />
      )}
    </div>
  );
}
