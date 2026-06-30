// Fails if the English and Nepali static-string catalogs drift apart. Pure
// (no DB) so it runs anywhere — wired into `pnpm verify` and CI as a hard gate.

import en from "../lib/i18n/messages/en.json";
import ne from "../lib/i18n/messages/ne.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, key)
      : [key];
  });
}

const enKeys = flatten(en).sort();
const neKeys = flatten(ne).sort();
const missing = enKeys.filter((k) => !neKeys.includes(k));
const extra = neKeys.filter((k) => !enKeys.includes(k));
const emptyNe = flatten(ne)
  .filter((k) => {
    const value = k
      .split(".")
      .reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], ne);
    return typeof value === "string" && value.trim() === "";
  });

let failed = false;
if (missing.length) {
  console.error("❌ Missing Nepali keys:\n   " + missing.join("\n   "));
  failed = true;
}
if (extra.length) {
  console.error("❌ Nepali keys with no English source:\n   " + extra.join("\n   "));
  failed = true;
}
if (emptyNe.length) {
  console.error("❌ Empty Nepali values:\n   " + emptyNe.join("\n   "));
  failed = true;
}

if (failed) process.exit(1);
console.log(`✓ i18n message-catalog parity OK (${enKeys.length} keys, en ↔ ne)`);
