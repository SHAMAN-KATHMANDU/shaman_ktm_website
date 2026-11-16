import { prisma } from "@/lib/db";
import { pageDetailFromRow } from "./dto";
import type { PageDetail } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getPage(slug: string, locale: Locale = "en"): Promise<PageDetail | null> {
  const row = await prisma.page.findUnique({ where: { slug } });
  return row ? pageDetailFromRow(row, locale) : null;
}
