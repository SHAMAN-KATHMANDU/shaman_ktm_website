import { prisma } from "@/lib/db";
import { collectionFromRow } from "./dto";
import type { Collection } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";
import { ONLINE_STOCK_LEVEL_SELECT } from "@/lib/stock/constants";

export async function getCollection(
  slug: string,
  locale: Locale = "en",
  limit = 24,
): Promise<Collection | null> {
  const row = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        where: { product: { status: "published" } },
        orderBy: { position: "asc" },
        take: Math.min(100, Math.max(1, Math.trunc(limit) || 24)),
        include: {
          product: {
            include: {
              variations: { include: { stockLevels: ONLINE_STOCK_LEVEL_SELECT } },
            },
          },
        },
      },
    },
  });
  return row ? collectionFromRow(row, locale) : null;
}
