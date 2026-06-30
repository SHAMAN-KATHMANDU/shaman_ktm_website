import { mockShowrooms } from "@/data/mock/showrooms";
import type { Showroom } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listShowrooms(locale: Locale = "en"): Promise<Showroom[]> {
  return mockShowrooms;
}
