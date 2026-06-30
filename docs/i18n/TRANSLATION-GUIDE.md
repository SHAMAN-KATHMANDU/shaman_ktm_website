# Translation & Localization Guide (English ↔ Nepali)

How bilingual content works in this codebase, how to verify it, and the
terminology glossary translators should follow.

## How it works

- **Storage.** Every translatable column has an optional Nepali twin named
  `<field>Ne` (e.g. `Product.nameNe`, `BlogPost.bodyMarkdownNe`). Empty/absent →
  the storefront falls back to the English column. Site copy (HomeCopy / Nav,
  inside `SiteConfig.data`) uses the same `<field>Ne` convention.
- **Static UI strings** (buttons, labels, errors) live in
  `lib/i18n/messages/{en,ne}.json`, typed by `lib/i18n/types.ts`.
- **Routing.** English is served at the unprefixed root; Nepali under `/ne/...`.
  The proxy (`proxy.ts`) sets an `x-locale` request header; server components
  read it via `getLocale()` (`lib/i18n/server.ts`). The active locale threads
  into the data layer (`?locale=ne`) and DTO mappers resolve `ne || en`.

## Verification commands

| Command | What it checks | Needs DB |
| --- | --- | --- |
| `pnpm i18n:parity` | en.json ↔ ne.json keys match, no empty Nepali values | no |
| `pnpm test` | DTO fallback, schema `*Ne` round-trip, routing helpers, catalog parity | no |
| `pnpm i18n:audit` | per-model Nepali coverage % of DB content | yes |
| `I18N_MIN_COVERAGE=80 pnpm i18n:audit` | fails CI/script under 80% coverage | yes |

`pnpm verify` runs typecheck + lint + test + `i18n:parity` (the DB-free gate).
Run `pnpm i18n:audit` against a seeded DB locally or on a schedule.

## Pre-release checklist

- [ ] `pnpm verify` is green.
- [ ] `pnpm i18n:audit` reviewed; coverage is acceptable for the release.
- [ ] New English content added this cycle has Nepali (or an intentional fallback).
- [ ] New user-facing UI strings were added to **both** `en.json` and `ne.json`.
- [ ] Language switcher toggles `/` ↔ `/ne` and preserves the current path.
- [ ] `<html lang>` is `ne` on `/ne/...` pages; hreflang alternates present.
- [ ] Devanagari renders correctly in admin inputs and on the storefront.
- [ ] No untranslated placeholder text is visible to users.

## Glossary

Keep terminology consistent. Add new terms here when they first appear.

| English | Nepali | Context |
| --- | --- | --- |
| Singing bowl | गायनकटोरा | Product type |
| Energy services | ऊर्जा सेवा | Service category |
| Sound healing | ध्वनि उपचार | Service |
| Enquire on WhatsApp | ह्वाट्सएपमा सोध्नुहोस् | Product CTA |
| Price on enquiry | मूल्यका लागि सम्पर्क गर्नुहोस् | Product pricing |
| In stock / Out of stock | स्टकमा छ / स्टक सकियो | Availability |
| Showroom | शोरूम | Retail location |
| Search | खोज्नुहोस् | Nav / search |
| Wishlist | इच्छासूची | Nav |
| Account | खाता | Nav |
| Metal / Earth / Wood / Plant / Water / Air | धातु / पृथ्वी / काठ / वनस्पति / पानी / हावा | The six elements |

## Conventions for translators

- Use Unicode Devanagari (UTF-8). Do not use legacy Preeti/Kruti Dev encodings.
- Prefer natural, modern Nepali over literal word-for-word translation.
- Leave brand names ("Shaman Kathmandu") and place names in their usual form.
- Keep numbers/prices in the same format as English unless told otherwise.
- When a Nepali translation is intentionally omitted, that's fine — the English
  value shows as a fallback; the audit will simply count it as untranslated.
