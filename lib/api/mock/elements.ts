import { ELEMENTS } from "@/data/mock/elements";
import type { ElementMeta } from "@/lib/api/types";

export async function listElements(): Promise<ElementMeta[]> {
  return ELEMENTS;
}
