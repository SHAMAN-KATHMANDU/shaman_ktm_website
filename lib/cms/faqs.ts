// Shared FAQ write logic, called by BOTH the REST routes (/api/sysuser/faqs)
// and the MCP tools (lib/mcp/tools/faqs.ts) so the two surfaces can never
// drift. Throws CmsError on reference failures; callers translate per
// transport. Busts the storefront FAQ cache on every write.

import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { FaqSchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { CmsError } from "./errors";

export type FaqInput = z.infer<typeof FaqSchema>;

const FAQ_INCLUDE = { category: { select: { id: true, slug: true, name: true } } } as const;

async function assertCategoryExists(categoryId: string | null): Promise<void> {
  if (!categoryId) return;
  const found = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (found) return;
  const all = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  throw new CmsError(`Unknown categoryId: ${categoryId}`, {
    statusCode: 400,
    referenceKind: "category",
    availableOptions: all.map((c) => `${c.id} (${c.name})`),
  });
}

// Blank Nepali means "fall back to English", stored as null like every other
// *Ne column.
function toData(d: FaqInput) {
  return {
    question: d.question,
    questionNe: d.questionNe?.trim() || null,
    answer: d.answer,
    answerNe: d.answerNe?.trim() || null,
    topic: d.topic,
    categoryId: d.categoryId || null,
    showOnHome: d.showOnHome,
    published: d.published,
    position: d.position,
  };
}

export async function listFaqsAdmin() {
  return prisma.faq.findMany({
    include: FAQ_INCLUDE,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function getFaq(id: string) {
  const faq = await prisma.faq.findUnique({ where: { id }, include: FAQ_INCLUDE });
  if (!faq) throw new CmsError(`FAQ not found: ${id}`, { statusCode: 404 });
  return faq;
}

export async function createFaq(d: FaqInput) {
  const data = toData(d);
  await assertCategoryExists(data.categoryId);
  const faq = await prisma.faq.create({ data, include: FAQ_INCLUDE });
  bumpTags(CACHE_TAGS.faqs);
  return faq;
}

export async function updateFaq(id: string, d: FaqInput) {
  await getFaq(id);
  const data = toData(d);
  await assertCategoryExists(data.categoryId);
  const faq = await prisma.faq.update({ where: { id }, data, include: FAQ_INCLUDE });
  bumpTags(CACHE_TAGS.faqs);
  return faq;
}

export async function deleteFaq(id: string) {
  await getFaq(id);
  await prisma.faq.delete({ where: { id } });
  bumpTags(CACHE_TAGS.faqs);
}
