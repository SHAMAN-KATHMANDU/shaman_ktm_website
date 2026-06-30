"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { parseProductTabs, renderMarkdown } from "@/lib/markdown";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

interface Props {
  description: string;
}

type TabKey = "about" | "howToUse" | "elementStory";

export function ProductTabs({ description }: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);

  const getLabel = (key: TabKey): string => {
    switch (key) {
      case "about":
        return t.product.aboutTab;
      case "howToUse":
        return t.product.howToUseTab;
      case "elementStory":
        return t.product.elementStoryTab;
    }
  };

  const tabs = parseProductTabs(description);
  const available: TabKey[] = ["about"];
  if (tabs.howToUse) available.push("howToUse");
  if (tabs.elementStory) available.push("elementStory");
  const [active, setActive] = useState<TabKey>("about");

  const content =
    active === "about"
      ? tabs.about
      : active === "howToUse"
        ? tabs.howToUse ?? ""
        : tabs.elementStory ?? "";

  return (
    <section className="mt-16 border-t border-[var(--color-border)] pt-12">
      <div className="flex border-b border-[var(--color-border)] mb-8" role="tablist">
        {available.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={active === k}
            onClick={() => setActive(k)}
            className={`label-nav text-xs py-3 px-5 border-b-2 transition-colors ${
              active === k
                ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                : "border-transparent text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
            }`}
          >
            {getLabel(k)}
          </button>
        ))}
      </div>
      <div
        className="text-[var(--color-cream)] max-w-3xl"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </section>
  );
}
