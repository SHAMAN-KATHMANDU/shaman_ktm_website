import Link from "next/link";
import type { ElementMeta } from "@/lib/api/types";
import { getDictionary } from "@/lib/i18n/getDictionary";
import {
  pickLocalized,
  localizeHref,
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/locale";

export function ElementCard({
  element,
  locale = DEFAULT_LOCALE,
}: {
  element: ElementMeta;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const name = pickLocalized(element, "name", locale);
  return (
    <Link
      href={localizeHref(`/products?element=${element.slug}`, locale)}
      data-element={element.slug}
      className="group relative block aspect-[4/5] border border-line bg-surface rounded-card overflow-hidden transition-all hover:-translate-y-1"
      style={{ borderColor: element.accent + "55" }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-10">
        <span
          className="text-7xl mb-4 transition-transform group-hover:scale-110"
          style={{ color: element.accent }}
          aria-hidden
        >
          {element.icon}
        </span>
        <h3 className="font-display text-3xl text-ink mb-2">
          {name}
        </h3>
        <p
          className="label-eyebrow mb-4"
          style={{ color: element.accent }}
        >
          {pickLocalized(element, "natureSource", locale)}
        </p>
        <p className="text-sm text-ink-soft max-w-xs leading-relaxed">
          {pickLocalized(element, "energyDescription", locale)}
        </p>
      </div>
      <span
        className="absolute bottom-4 left-1/2 -translate-x-1/2 label-nav text-[10px] whitespace-nowrap"
        style={{ color: element.accent }}
      >
        {t.elements.explore.replace("{name}", name)}
      </span>
    </Link>
  );
}
