// Shared practitioner write logic, called by BOTH the REST routes
// (/api/sysuser/practitioners) and the MCP tools (lib/mcp/tools/practitioners.ts)
// so the two surfaces cannot drift. Throws CmsError on bad references.

import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { PractitionerSchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { CmsError } from "./errors";

export type PractitionerInput = z.infer<typeof PractitionerSchema>;

const INCLUDE = { services: { select: { slug: true, name: true } } } as const;

async function assertServicesExist(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const found = await prisma.service.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  const missing = slugs.filter((s) => !found.some((f) => f.slug === s));
  if (missing.length === 0) return;
  const all = await prisma.service.findMany({ select: { slug: true, name: true } });
  throw new CmsError(`Unknown service slug(s): ${missing.join(", ")}`, {
    statusCode: 400,
    referenceKind: "service",
    availableOptions: all.map((s) => `${s.slug} (${s.name})`),
  });
}

// Blank optional text is stored as null, like every other *Ne column.
function toData(d: PractitionerInput) {
  const opt = (v: string | null | undefined) => v?.trim() || null;
  return {
    name: d.name,
    nameNe: opt(d.nameNe),
    role: opt(d.role),
    roleNe: opt(d.roleNe),
    bio: d.bio,
    bioNe: opt(d.bioNe),
    training: opt(d.training),
    trainingNe: opt(d.trainingNe),
    photoUrl: d.photoUrl || null,
    published: d.published,
    position: d.position,
  };
}

const bump = () => bumpTags(CACHE_TAGS.practitioners, CACHE_TAGS.services);

export async function listPractitionersAdmin() {
  return prisma.practitioner.findMany({
    include: INCLUDE,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function getPractitioner(id: string) {
  const p = await prisma.practitioner.findUnique({ where: { id }, include: INCLUDE });
  if (!p) throw new CmsError(`Practitioner not found: ${id}`, { statusCode: 404 });
  return p;
}

export async function createPractitioner(d: PractitionerInput) {
  await assertServicesExist(d.serviceSlugs);
  const p = await prisma.practitioner.create({
    data: { ...toData(d), services: { connect: d.serviceSlugs.map((slug) => ({ slug })) } },
    include: INCLUDE,
  });
  bump();
  return p;
}

export async function updatePractitioner(id: string, d: PractitionerInput) {
  await getPractitioner(id);
  await assertServicesExist(d.serviceSlugs);
  const p = await prisma.practitioner.update({
    where: { id },
    data: { ...toData(d), services: { set: d.serviceSlugs.map((slug) => ({ slug })) } },
    include: INCLUDE,
  });
  bump();
  return p;
}

export async function deletePractitioner(id: string) {
  await getPractitioner(id);
  await prisma.practitioner.delete({ where: { id } });
  bump();
}

/** Published practitioners for one service page, in display order. */
export async function practitionersForService(slug: string) {
  return prisma.practitioner.findMany({
    where: { published: true, services: { some: { slug } } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}
