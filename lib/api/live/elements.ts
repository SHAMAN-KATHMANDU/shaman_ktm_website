import { apiGet } from "@/lib/api/client";
import type { ElementMeta } from "@/lib/api/types";

export async function listElements(): Promise<ElementMeta[]> {
  const res = await apiGet<{ message: string; elements: ElementMeta[] }>(
    "/elements",
  );
  return res.elements;
}
