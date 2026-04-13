"use client";

import { useCallback, useSyncExternalStore } from "react";

type Lang = "en" | "np";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-lang"],
  });
  return () => mo.disconnect();
}

function getSnapshot(): Lang {
  const v = document.documentElement.getAttribute("data-lang");
  return v === "np" ? "np" : "en";
}

function getServerSnapshot(): Lang {
  return "en";
}

export function LangToggle({ className = "sk-lang-toggle" }: { className?: string }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Lang = lang === "en" ? "np" : "en";
    document.documentElement.setAttribute("data-lang", next);
    try {
      localStorage.setItem("sk-lang", next);
    } catch {}
  }, [lang]);

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-label={lang === "en" ? "Switch to Nepali" : "Switch to English"}
    >
      {lang === "en" ? "EN | NP" : "NP | EN"}
    </button>
  );
}
