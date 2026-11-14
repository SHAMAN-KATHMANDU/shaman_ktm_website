import { apiGet } from "@/lib/api/client";
import type { Service } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listServices(locale: Locale = "en"): Promise<Service[]> {
  const res = await apiGet<{ message: string; services: Service[] }>(
    "/services",
    undefined,
    locale,
  );
  return res.services;
}

