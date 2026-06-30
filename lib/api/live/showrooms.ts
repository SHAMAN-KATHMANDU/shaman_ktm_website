import { apiGet } from "@/lib/api/client";
import type { Showroom } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listShowrooms(locale: Locale = "en"): Promise<Showroom[]> {
  const res = await apiGet<{ message: string; showrooms: Showroom[] }>(
    "/showrooms",
    undefined,
    locale,
  );
  return res.showrooms;
}
