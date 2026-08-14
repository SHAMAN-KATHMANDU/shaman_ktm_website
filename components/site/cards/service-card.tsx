import Link from "next/link";
import type { Service } from "@/lib/api/types";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";
import {
  pickLocalized,
  localizeHref,
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/locale";

export function ServiceCard({
  service,
  ctaLabel,
  locale = DEFAULT_LOCALE,
}: {
  service: Service;
  ctaLabel?: string;
  locale?: Locale;
}) {
  const meta = ELEMENT_BY_SLUG[service.element];
  return (
    <Link
      href={localizeHref(`/energy/${service.slug}`, locale)}
      data-element={service.element}
      className="group relative flex bg-surface border border-line hover:border-metal rounded-card transition-colors overflow-hidden"
    >
      <div
        className="w-1 self-stretch transition-all group-hover:w-2"
        style={{ background: meta.accent }}
        aria-hidden
      />
      <div className="flex-1 p-6">
        <p
          className="label-eyebrow mb-2"
          style={{ color: meta.accent }}
        >
          {pickLocalized(meta, "name", locale)} · {service.duration}
        </p>
        <h3 className="font-display text-2xl text-ink mb-3 leading-tight">
          {service.name}
        </h3>
        <p className="text-sm text-ink-soft mb-4 line-clamp-2">
          {service.summary}
        </p>
        <span className="text-metal-text text-sm">
          {ctaLabel ?? "Enquire on WhatsApp"}
        </span>
      </div>
    </Link>
  );
}
