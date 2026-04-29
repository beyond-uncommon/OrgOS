import { prisma } from "@orgos/db";
import type { Role } from "@orgos/shared-types";

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { department: true } });
}

export async function getUsersByDepartment(departmentId: string) {
  return prisma.user.findMany({ where: { departmentId } });
}

export async function getUsersByRole(role: Role) {
  return prisma.user.findMany({ where: { role } });
}
