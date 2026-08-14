"use client";

// Catches uncaught errors thrown by route segments under (any non-/sysuser
// segment that doesn't define its own error boundary). Per Next 16 contract
// this must be a client component.

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[route error]", error);
  }, [error]);

  return (
    <section className="hero-bg min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-xl">
        <p className="label-eyebrow mb-4">{t.errors.title}</p>
        <h1 className="display-heading font-display text-4xl md:text-5xl text-ink leading-tight">
          {t.errors.subtitle}
        </h1>
        <p className="text-ink-soft mt-6 mb-10">
          {t.errors.body}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 border border-line text-ink label-nav hover:bg-surface transition-colors rounded-input"
          >
            {t.errors.retry}
          </button>
          <Link
            href="/"
            className="px-8 py-3 border border-line text-ink label-nav hover:bg-surface transition-colors rounded-input"
          >
            {t.errors.backHome}
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-xs text-ink-soft opacity-50">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </section>
  );
}
