import { mockCategories } from "@/data/mock/categories";
import type { Category } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listCategories(locale: Locale = "en"): Promise<Category[]> {
  return mockCategories;
}
