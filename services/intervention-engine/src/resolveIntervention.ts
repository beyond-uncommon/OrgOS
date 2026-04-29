import { prisma, InterventionStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";

export async function resolveIntervention(
  interventionId: string,
  notes: string
): Promise<ActionResult<void>> {
  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
  });
  if (!intervention) return { success: false, error: "Intervention not found." };
  if (intervention.status === InterventionStatus.RESOLVED) {
    return { success: false, error: "Intervention is already resolved." };
  }

  await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      status: InterventionStatus.RESOLVED,
      notes,
      resolvedAt: new Date(),
    },
  });

  // Mark parent alert resolved
  await prisma.alert.update({
    where: { id: intervention.alertId },
    data: { resolved: true },
  });

  return { success: true, data: undefined };
}
