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
import { getLocale } from "@/lib/i18n/server";

async function loadAnnouncement() {
  try {
    return await prisma.announcement.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

export async function SiteShell({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const [nav, homeCopy, modules, showrooms, announcement] = await Promise.all([
    getNavConfig(),
    getHomeCopy(),
    getSiteModules(),
    listShowrooms(locale).catch((): Showroom[] => []),
    loadAnnouncement(),
  ]);
  const announcementMessage =
    (locale === "ne" ? announcement?.messageNe : null) ??
    announcement?.message ??
    "";

  // Always mount the AnnouncementBar — it re-fetches /api/public/v1/announcement
  // on the client so an editor's save shows up on the very next page load,
  // even if the row was empty at SSR time. The component itself returns null
  // if there's nothing to show.
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)]">
      <AnnouncementBar
        announcement={{
          enabled: announcement?.enabled ?? false,
          message: announcementMessage,
          href: announcement?.href ?? null,
          bgColor: announcement?.bgColor ?? "#c4a35a",
          fgColor: announcement?.fgColor ?? "#0a0806",
          dismissable: announcement?.dismissable ?? true,
        }}
      />
      <Header nav={nav} />
      <main className="flex-1">{children}</main>
      <Footer nav={nav} showrooms={showrooms} homeCopy={homeCopy} locale={locale} />
      {modules.whatsappFloat && (
        <WhatsAppFloat label={nav.ctaWhatsappFloatLabel} />
      )}
    </div>
  );
}
