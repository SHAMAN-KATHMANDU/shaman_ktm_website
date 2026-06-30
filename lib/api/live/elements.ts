import { apiGet } from "@/lib/api/client";
import type { ElementMeta } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listElements(locale: Locale = "en"): Promise<ElementMeta[]> {
  const res = await apiGet<{ message: string; elements: ElementMeta[] }>(
    "/elements",
    undefined,
    locale,
  );
  return res.elements;
}
