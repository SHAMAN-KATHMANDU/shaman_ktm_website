import { apiGet } from "@/lib/api/client";
import type { Service } from "@/lib/api/types";

export async function listServices(): Promise<Service[]> {
  const res = await apiGet<{ message: string; services: Service[] }>(
    "/services",
  );
  return res.services;
}

export async function getService(slug: string): Promise<Service> {
  const res = await apiGet<{ message: string; service: Service }>(
    `/services/${encodeURIComponent(slug)}`,
  );
  return res.service;
}
