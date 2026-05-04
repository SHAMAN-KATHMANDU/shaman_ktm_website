"use client";

/**
 * "Scroll ↓" indicator at the bottom of the hero. Always scrolls to the
 * section directly below the hero (BrandStrip / FeaturedStory / etc.,
 * whichever the editor has enabled in /sysuser/modules), instead of
 * navigating away to /stories like the previous Link-based version did.
 */
export function ScrollDownButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === "undefined") return;
        const hero = document.getElementById("home-hero");
        const next = hero?.nextElementSibling as HTMLElement | null;
        if (next?.scrollIntoView) {
          next.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
        }
      }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 label-nav text-[10px] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
      aria-label="Scroll to next section"
    >
      Scroll ↓
    </button>
  );
}
