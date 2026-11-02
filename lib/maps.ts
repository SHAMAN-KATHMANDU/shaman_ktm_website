// Whether a stored showroom map URL is safe to put in an iframe.
//
// Why this exists: the showrooms shipped with placeholder embed URLs copied from
// the mock data, and Google rejects them. The iframe then renders Google's own
// error text — "Google Maps Platform rejected your request. Invalid 'pb'
// parameter." — right on the contact page, on the live site, where a customer is
// trying to find the shop. A missing map is fine; the address and the WhatsApp
// button are what they actually need. A box full of Google's error copy is not.

/**
 * A real Google Maps "Embed a map" URL carries a long, opaque `pb` payload —
 * the place, viewport, language and marker data, typically 200+ characters with
 * several `!3m`/`!5e`/`!2s` segments. The placeholders that shipped are ~58
 * characters of coordinates and nothing else, so length separates them cleanly
 * without rejecting anything Google actually produces.
 */
const MIN_PB_LENGTH = 100;

export function isRenderableMapEmbed(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  // Only Google's embed endpoint — this value ends up as an iframe src.
  const host = parsed.hostname.toLowerCase();
  const isGoogleHost = host === "www.google.com" || host.endsWith(".google.com");
  if (!isGoogleHost || !parsed.pathname.startsWith("/maps/embed")) return false;

  const pb = parsed.searchParams.get("pb");
  if (!pb) return false;
  return pb.length >= MIN_PB_LENGTH;
}
