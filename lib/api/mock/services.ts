import { mockServices, findServiceBySlug } from "@/data/mock/services";
import type { Service } from "@/lib/api/types";

export async function listServices(): Promise<Service[]> {
  return mockServices;
}

export async function getService(slug: string): Promise<Service> {
  const s = findServiceBySlug(slug);
  if (!s) throw new Error(`Service not found: ${slug}`);
  return s;
}
