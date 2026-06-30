// Loads the static UI-string catalog for a locale. Synchronous (the JSON is
// bundled), so it works in both Server and Client Components. Server pages
// resolve it once via `getDictionary(await getLocale())` and pass the slice a
// Client Component needs down as props.

import type { Messages } from "./types";
import type { Locale } from "./locale";
import en from "./messages/en.json";
import ne from "./messages/ne.json";

const dictionaries: Record<Locale, Messages> = {
  en: en as Messages,
  ne: ne as Messages,
};

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries.en;
}
