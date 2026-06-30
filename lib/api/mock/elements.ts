import { ELEMENTS } from "@/data/mock/elements";
import type { ElementMeta } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listElements(locale: Locale = "en"): Promise<ElementMeta[]> {
  return ELEMENTS;
}
