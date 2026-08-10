// Resolving the human behind a request. Reporting records are attributable by
// design — createdByStaffId / enteredByStaffId are non-null — so an admin must
// have a linked Staff row before they can record CRM, sales, or footfall data.

import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";

/**
 * The Staff row linked to a signed-in admin, or null when none is linked.
 * Use for optional attribution (e.g. a stock adjustment, which still records
 * the actor in AdminLog either way).
 */
export async function findActingStaff(adminUserId: string) {
  return prisma.staff.findUnique({
    where: { adminUserId },
    select: { id: true, name: true, defaultShowroomKey: true, active: true },
  });
}

/**
 * The Staff row linked to a signed-in admin, or a 409 explaining how to fix it.
 * Use where attribution is mandatory (CRM leads, sales, footfall entries).
 */
export async function requireActingStaff(adminUserId: string, email: string) {
  const staff = await findActingStaff(adminUserId);
  if (!staff) {
    throw new CmsError(
      `No staff record is linked to ${email}. Create one under Operations → Staff and set its login to this account — reporting records must be attributable to a person.`,
      { statusCode: 409, referenceKind: "staffId" },
    );
  }
  if (!staff.active) {
    throw new CmsError(
      `The staff record for ${email} is inactive. Reactivate it under Operations → Staff to record data.`,
      { statusCode: 409, referenceKind: "staffId" },
    );
  }
  return staff;
}

/**
 * Which showroom a staff member's entry belongs to: their default, or the
 * explicit choice a floater (no default) must supply.
 */
export async function resolveShowroomForStaff(
  staff: { defaultShowroomKey: string | null },
  explicitShowroomKey?: string | null,
): Promise<string | null> {
  if (explicitShowroomKey) return explicitShowroomKey;
  return staff.defaultShowroomKey;
}
