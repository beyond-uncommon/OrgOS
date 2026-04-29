import { prisma, InterventionStatus } from "@orgos/db";

export async function getOpenInterventions(departmentId?: string) {
  return prisma.intervention.findMany({
    where: {
      status: { not: InterventionStatus.RESOLVED },
      ...(departmentId
        ? { assignedTo: { departmentId } }
        : {}),
    },
    include: { alert: true, assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInterventionById(id: string) {
  return prisma.intervention.findUnique({
    where: { id },
    include: { alert: true, assignedTo: true },
  });
}
