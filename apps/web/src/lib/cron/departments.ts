import { prisma, Role } from "@orgos/db";

export async function getAllDepartments() {
  return prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getDepartmentsWithInstructors() {
  return prisma.department.findMany({
    where: {
      users: { some: { role: Role.INSTRUCTOR } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
