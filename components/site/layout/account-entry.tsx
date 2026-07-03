"use client";

// Auth-aware account entry for the header and mobile menu. Signed out it
// offers Login + Create account; signed in it becomes a link to the
// dashboard carrying the customer's first name. The CMS nav config can
// still override the logged-out login label (headerLoginLabel), and
// setting that label to "" hides the whole entry — same contract the old
// static link had.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import type { NavConfig } from "@/lib/site-content";
import { splitLocale, localizeHref, pickLocalized } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { UserIcon } from "@/components/site/icons";

interface Props {
  nav: NavConfig;
  /** "header" = compact right-side row items; "menu" = mobile menu rows. */
  variant: "header" | "menu";
  onNavigate?: () => void;
}

export function AccountEntry({ nav, variant, onNavigate }: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const { user, hydrated } = useAuth();

  // CMS contract (from the old static link): clearing the label or href
  // hides the account entry entirely.
  if (nav.headerLoginLabel === "" || nav.headerLoginHref === "") return null;
  const loginLabel =
    pickLocalized(nav, "headerLoginLabel", locale) || t.nav.login;
  const loginHref = nav.headerLoginHref || "/account/login";

  const linkCls =
    variant === "header"
      ? "hidden md:inline-flex items-center gap-1.5 label-nav text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] transition-colors"
      : "hover:text-[var(--color-gold)]";

  if (hydrated && user) {
    const firstName = user.name.trim().split(/\s+/)[0] || t.nav.account;
    return (
      <Link
        href={localizeHref("/account/dashboard", locale)}
        onClick={onNavigate}
        aria-label={t.nav.account}
        className={linkCls}
      >
        <UserIcon size={16} />
        <span className="max-w-[10rem] truncate">{firstName}</span>
      </Link>
    );
  }

  return (
    <>
      <Link
        href={localizeHref(loginHref, locale)}
        onClick={onNavigate}
        className={linkCls}
      >
        {loginLabel}
      </Link>
      <Link
        href={localizeHref("/account/register", locale)}
        onClick={onNavigate}
        className={linkCls}
      >
        {t.nav.createAccount}
      </Link>
    </>
  );
}
