import Link from "next/link";
import { Logo } from "./logo";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WaIcon,
  YouTubeIcon,
} from "@/components/site/icons";
import { SOCIAL, WA_LINK } from "@/lib/contact";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, SocialLink, HomeCopy } from "@/lib/site-content";
import type { Showroom } from "@/lib/api/types";

const SOCIAL_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  whatsapp: WaIcon,
};

function resolveSocialHref(s: SocialLink): string {
  if (s.href) return s.href;
  // Fall back to the legacy SOCIAL/WA_LINK helpers so the footer keeps
  // working even before the editor fills in the new fields.
  switch (s.key) {
    case "instagram":
      return SOCIAL.instagram;
    case "tiktok":
      return SOCIAL.tiktok;
    case "facebook":
      return SOCIAL.facebook;
    case "youtube":
      return SOCIAL.youtube;
    case "whatsapp":
      return WA_LINK;
    default:
      return "#";
  }
}

export function Footer({
  nav,
  showrooms,
  homeCopy,
  locale,
}: {
  nav: NavConfig;
  showrooms: Showroom[];
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-gold-muted)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
          <div>
            <Logo size="lg" href={localizeHref(nav.logoHref, locale)} />
            {pickLocalized(homeCopy, "footerTagline", locale) && (
              <p className="mt-6 max-w-sm text-sm leading-relaxed">
                {pickLocalized(homeCopy, "footerTagline", locale)}
              </p>
            )}
            <div className="mt-6 flex items-center gap-4 text-[var(--color-gold-muted)]">
              {nav.footerSocials.map((s) => {
                const Icon = SOCIAL_ICONS[s.key];
                if (!Icon) return null;
                return (
                  <a
                    key={s.key}
                    href={resolveSocialHref(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="hover:text-[var(--color-gold)]"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {pickLocalized(nav, "footerColumns", locale).map((col, i) => (
            <div key={`${col.heading}-${i}`}>
              <h5 className="label-eyebrow mb-4">{col.heading}</h5>
              <ul className="space-y-2 text-sm">
                {col.links.map((l, j) => (
                  <li key={`${l.href}-${j}`}>
                    {l.external ||
                    l.href.startsWith("mailto:") ||
                    l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        target={l.external ? "_blank" : undefined}
                        rel={l.external ? "noopener noreferrer" : undefined}
                        className="hover:text-[var(--color-gold)]"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={localizeHref(l.href, locale)}
                        className="hover:text-[var(--color-gold)]"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {showrooms.length > 0 && (
            <div>
              <h5 className="label-eyebrow mb-4">Showrooms</h5>
              <ul className="space-y-3 text-xs leading-relaxed">
                {showrooms.map((s) => (
                  <li key={s.key}>
                    <strong className="block text-[var(--color-cream)] text-sm font-normal mb-0.5">
                      {s.name}
                    </strong>
                    <span>{s.address}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--color-border-soft)] text-xs">
          {pickLocalized(nav, "footerQuote", locale) && (
            <p className="font-display italic text-[var(--color-cream)] text-base mb-6">
              &ldquo;{pickLocalized(nav, "footerQuote", locale)}&rdquo;
            </p>
          )}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span>
              © {new Date().getFullYear()}{" "}
              {pickLocalized(homeCopy, "footerCopyright", locale) || "Shaman Kathmandu"}
            </span>
            <div className="flex flex-wrap gap-5">
              {pickLocalized(nav, "footerLegalLinks", locale).map((l, i) => (
                <Link
                  key={`${l.href}-${i}`}
                  href={localizeHref(l.href, locale)}
                  className="hover:text-[var(--color-gold)]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
