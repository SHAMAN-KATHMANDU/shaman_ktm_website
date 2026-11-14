// Post-login redirect targets come from the query string, so they must be
// reduced to a same-origin path. Parsing with the URL API (instead of prefix
// checks) catches what browsers treat as another host: "//evil.com",
// "/\evil.com", "https://…". A fixed base works on the server render too and
// gives the same answer as location.origin would.

const BASE = "http://same-origin.invalid";

export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  const path = url.pathname + url.search + url.hash;
  // "/.//evil.com" normalises to "//evil.com", which is protocol-relative.
  if (url.origin !== BASE || path.startsWith("//")) return fallback;
  return path;
}
