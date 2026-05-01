import { mockCategories } from "@/data/mock/categories";
import type { Category } from "@/lib/api/types";

export async function listCategories(): Promise<Category[]> {
  return mockCategories;
}
