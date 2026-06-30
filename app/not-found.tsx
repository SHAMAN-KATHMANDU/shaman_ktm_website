import Link from "next/link";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function NotFound() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  if (IS_COMING_SOON) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "var(--font-body), sans-serif",
          color: "var(--uc-ink-strong)",
          background: "var(--uc-bg-a)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Nothing here yet
          </h1>
          <p style={{ marginBottom: "1.25rem" }}>
            Our new site is on the way.
          </p>
          <Link
            href="/"
            style={{ color: "var(--uc-accent)", textDecoration: "underline" }}
          >
            Back home →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SiteProviders>
      <SiteShell>
        <section className="hero-bg min-h-[80vh] flex items-center justify-center px-6">
          <div className="text-center max-w-xl">
            <p className="label-eyebrow mb-4">404</p>
            <h1 className="display-heading font-display text-5xl text-[var(--color-cream)] leading-tight">
              {t.errors.notFoundTitle}
            </h1>
            <p className="text-[var(--color-gold-muted)] mt-6 mb-10">
              {t.errors.notFoundBody}
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 border border-[var(--color-gold)] text-[var(--color-gold)] label-nav hover:bg-[var(--color-gold)] hover:text-[var(--color-base)] transition-colors"
            >
              {t.errors.backHome}
            </Link>
          </div>
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
