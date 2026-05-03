// URL-safe slug from arbitrary text. Latin only — Devanagari titles fall
// back to a nanoid suffix.

import { nanoid } from "nanoid";

export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || `item-${nanoid(8)}`;
}
