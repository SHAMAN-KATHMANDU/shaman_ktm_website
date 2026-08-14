"use client";

import type { ElementMeta } from "@/lib/api/types";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";

interface Props {
  elements: ElementMeta[];
  activeSlug?: string;
  allLabel: string;
  locale: Locale;
  onSelect: (slug?: string) => void;
}

const chipBase =
  "label-nav text-[11px] px-4 py-2 border rounded-input whitespace-nowrap snap-start cursor-pointer transition-colors";

/** The six nature elements as selectable filter chips — the old /nature
 *  taxonomy folded into the products listing. */
export function ElementChips({
  elements,
  activeSlug,
  allLabel,
  locale,
  onSelect,
}: Props) {
  return (
    <nav
      aria-label={allLabel}
      className="-mx-6 md:-mx-10 px-6 md:px-10 overflow-x-auto lg:mx-0 lg:px-0 lg:overflow-visible"
    >
      <ul className="flex w-max gap-2 snap-x lg:w-full lg:flex-wrap">
        <li>
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            aria-pressed={!activeSlug}
            className={`${chipBase} ${
              !activeSlug
                ? "border-metal bg-metal-tint text-ink"
                : "border-line text-ink-soft hover:border-metal hover:text-ink"
            }`}
          >
            {allLabel}
          </button>
        </li>
        {elements.map((el) => {
          const active = activeSlug === el.slug;
          return (
            <li key={el.slug} data-element={el.slug}>
              <button
                type="button"
                onClick={() => onSelect(active ? undefined : el.slug)}
                aria-pressed={active}
                className={`${chipBase} inline-flex items-center gap-2 ${
                  active
                    ? "border-[var(--el)] bg-[var(--el)]/10 text-ink"
                    : "border-line text-ink-soft hover:border-[var(--el)] hover:text-ink"
                }`}
              >
                <span aria-hidden style={{ color: "var(--el)" }}>
                  {el.icon}
                </span>
                {pickLocalized(el, "name", locale)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
