import { mockServices, findServiceBySlug } from "@/data/mock/services";
import type { Service } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listServices(locale: Locale = "en"): Promise<Service[]> {
  return mockServices;
}

export async function getService(slug: string, locale: Locale = "en"): Promise<Service> {
  const s = findServiceBySlug(slug);
  if (!s) throw new Error(`Service not found: ${slug}`);
  return s;
}
