"use client";

// Tracks clicks on contact links (WhatsApp, phone, email) and fires GA4/Pixel events.
// A single delegated listener on document captures all href-based contact attempts.

import { useEffect } from "react";
import { trackGenerateLead } from "@/lib/analytics";
import { track as pixelTrack } from "@/lib/pixel";
import { storeAttributionIfNew } from "@/lib/attribution";

/** Extract method from href: 'whatsapp'|'phone'|'email'|null. */
export function getContactMethodFromHref(href: string): "whatsapp" | "phone" | "email" | null {
  if (!href) return null;
  if (href.startsWith("https://wa.me") || href.startsWith("https://api.whatsapp.com")) {
    return "whatsapp";
  }
  if (href.startsWith("tel:")) {
    return "phone";
  }
  if (href.startsWith("mailto:")) {
    return "email";
  }
  return null;
}

export function ClickTracking() {
  useEffect(() => {
    // Mounted on every storefront page, so this is where first touch lands —
    // whichever page a visitor arrives on from search, an AI answer or an ad.
    storeAttributionIfNew();

    function handleClick(event: Event) {
      if (!(event instanceof MouseEvent)) return;
      const target = event.target as Element;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const method = getContactMethodFromHref(anchor.href);
      if (!method) return;

      // Get nearest data-track-location attribute, falling back to pathname
      let location = window.location.pathname;
      let current: Element | null = anchor;
      while (current) {
        const trackLocation = current.getAttribute("data-track-location");
        if (trackLocation) {
          location = trackLocation;
          break;
        }
        current = current.parentElement;
      }

      // Fire GA4 event
      trackGenerateLead(method, { link_location: location });

      // Fire Meta Pixel event
      pixelTrack("Contact", { content_name: method, value: 0, currency: "NPR" });
    }

    // Capture phase to ensure we get the event before any handlers stop propagation
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
