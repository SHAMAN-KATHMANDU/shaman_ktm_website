import { apiGet } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listCategories(locale: Locale = "en"): Promise<Category[]> {
  const res = await apiGet<{ message: string; categories: Category[] }>(
    "/categories",
    undefined,
    locale,
  );
  return res.categories;
}
