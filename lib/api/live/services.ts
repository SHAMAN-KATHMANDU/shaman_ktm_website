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

export async function getService(slug: string, locale: Locale = "en"): Promise<Service> {
  const res = await apiGet<{ message: string; service: Service }>(
    `/services/${encodeURIComponent(slug)}`,
    undefined,
    locale,
  );
  return res.service;
}
