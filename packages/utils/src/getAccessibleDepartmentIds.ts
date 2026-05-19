import type { PrismaClient } from "@orgos/db";

const ORG_WIDE_ROLES = new Set([
  "COUNTRY_DIRECTOR",
  "ADMIN",
  "HEAD_OF_OPERATIONS",
  "M_AND_E",
  "SAFEGUARDING",
  "MARKETING_COMMS_MANAGER",
  "BUSINESS_DEVELOPMENT_MANAGER",
  "BUSINESS_DEVELOPMENT_ASSOCIATE",
  "HR_OFFICER",
  "FINANCE_ADMIN_OFFICER",
  "HEAD_OF_DESIGN",
  "HEAD_OF_DEVELOPMENT",
  "CAREER_DEVELOPMENT_OFFICER",
  "REGIONAL_HUB_LEAD",
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
 * - INSTRUCTOR / STUDENT / PARTNER: returns [] (scoped by userId, not department)
 * - ORG_WIDE_ROLES: returns all department IDs
 * - HUB_LEAD: returns [departmentId]
 * - BOOTCAMP_MANAGER, PROGRAM_MANAGER, YOUTH_CODING_MANAGER,
 *   TEACHER_TRAINING_COORDINATOR: returns [departmentId, ...descendants]
 */
export async function getAccessibleDepartmentIds(
  role: string,
  departmentId: string | null,
  prisma: PrismaClient,
): Promise<string[]> {
  if (role === "INSTRUCTOR" || role === "STUDENT" || role === "PARTNER") return [];

  if (ORG_WIDE_ROLES.has(role)) {
    const all = await prisma.department.findMany({ select: { id: true } });
    return all.map((d) => d.id);
  }

  if (!departmentId) return [];

  if (role === "HUB_LEAD") return [departmentId];

  const descendants = await collectDescendantIds(prisma, departmentId);
  return [departmentId, ...descendants];
}
