import type { PrismaClient } from "@orgos/db";

// Roles that see all departments regardless of their own departmentId
const ORG_WIDE_ROLES = new Set([
  "COUNTRY_DIRECTOR",
  "ADMIN",
  "SAFEGUARDING",
  "M_AND_E",
  "MARKETING_COMMS_MANAGER",
  "BUSINESS_DEVELOPMENT_MANAGER",
  "BUSINESS_DEVELOPMENT_ASSOCIATE",
  "HR_OFFICER",
  "FINANCE_ADMIN_OFFICER",
  "HEAD_OF_OPERATIONS",
]);

async function collectDescendantIds(
  prisma: PrismaClient,
  departmentId: string,
): Promise<string[]> {
  const children = await prisma.department.findMany({
    where: { parentDepartmentId: departmentId },
    select: { id: true },
  });
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const nested = await collectDescendantIds(prisma, child.id);
    ids.push(...nested);
  }
  return ids;
}

/**
 * Returns the set of department IDs a user with the given role can access.
 *
 * - INSTRUCTOR: returns [] — scoped by userId, not department
 * - HUB_LEAD: returns [departmentId]
 * - BOOTCAMP_MANAGER: returns [departmentId, ...child hub IDs]
 * - PROGRAM_MANAGER: returns [departmentId, ...all bootcamp + hub IDs beneath]
 * - COUNTRY_DIRECTOR / ADMIN / cross-cutting roles: returns all department IDs
 *   (departmentId argument is ignored for these roles)
 */
export async function getAccessibleDepartmentIds(
  role: string,
  departmentId: string | null,
  prisma: PrismaClient,
): Promise<string[]> {
  if (role === "INSTRUCTOR") return [];

  if (ORG_WIDE_ROLES.has(role)) {
    const all = await prisma.department.findMany({ select: { id: true } });
    return all.map((d) => d.id);
  }

  if (!departmentId) return [];

  if (role === "HUB_LEAD") return [departmentId];

  // BOOTCAMP_MANAGER and PROGRAM_MANAGER: own dept + all descendants
  const descendants = await collectDescendantIds(prisma, departmentId);
  return [departmentId, ...descendants];
}
