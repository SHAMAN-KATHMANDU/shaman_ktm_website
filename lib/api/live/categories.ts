import { apiGet } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";

export async function listCategories(): Promise<Category[]> {
  const res = await apiGet<{ message: string; categories: Category[] }>(
    "/categories",
  );
  return res.categories;
}
