"use client";

import { useEffect } from "react";

// Mounts once per page and reveals any [data-reveal] / [data-reveal-stagger]
// element as it scrolls into view (adds .is-visible, then stops watching it).
// A single shared IntersectionObserver keeps it cheap. Honors reduced-motion
// by revealing everything immediately.
export function ScrollReveal() {
  useEffect(() => {
    const selector = "[data-reveal], [data-reveal-stagger]";
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    );
    if (els.length === 0) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        }
      },
      // Trigger a touch before the element is fully in view.
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
