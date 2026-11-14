import { mockServices } from "@/data/mock/services";
import type { Service } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listServices(locale: Locale = "en"): Promise<Service[]> {
  return mockServices;
}

