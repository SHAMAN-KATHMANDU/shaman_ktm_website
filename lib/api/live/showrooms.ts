import { apiGet } from "@/lib/api/client";
import type { Showroom } from "@/lib/api/types";

export async function listShowrooms(): Promise<Showroom[]> {
  const res = await apiGet<{ message: string; showrooms: Showroom[] }>(
    "/showrooms",
  );
  return res.showrooms;
}
