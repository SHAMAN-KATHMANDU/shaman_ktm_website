import { mockShowrooms } from "@/data/mock/showrooms";
import type { Showroom } from "@/lib/api/types";

export async function listShowrooms(): Promise<Showroom[]> {
  return mockShowrooms;
}
