import { prisma, InterventionStatus } from "@orgos/db";
import type { Severity, Intervention } from "@orgos/shared-types";
import type { ActionResult } from "@orgos/utils";

interface CreateInterventionInput {
  alertId: string;
  issueType: string;
  severity: Severity;
  assignedToId: string;
  notes?: string;
}

export async function createIntervention(
  input: CreateInterventionInput
): Promise<ActionResult<Intervention>> {
  const intervention = await prisma.intervention.create({
    data: {
      alertId: input.alertId,
      issueType: input.issueType,
      severity: input.severity,
      assignedToId: input.assignedToId,
      status: InterventionStatus.OPEN,
      notes: input.notes ?? "",
    },
  });

  return { success: true, data: intervention };
}
