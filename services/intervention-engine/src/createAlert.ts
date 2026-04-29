import { prisma, Severity, InterventionStatus } from "@orgos/db";
import type { AlertType, Alert, AnomalyMetadata } from "@orgos/shared-types";
import type { ActionResult } from "@orgos/utils";

interface CreateAlertInput {
  type: AlertType;
  severity: Severity;
  entryId?: string;
  weeklyReportId?: string;
  monthlyReportId?: string;
  metadata?: AnomalyMetadata;
  autoAssignTo?: string; // userId for auto-intervention on HIGH/CRITICAL
}

export async function createAlert(
  input: CreateAlertInput
): Promise<ActionResult<Alert>> {
  const alert = await prisma.alert.create({
    data: {
      type: input.type,
      severity: input.severity,
      ...(input.entryId ? { entryId: input.entryId } : {}),
      ...(input.weeklyReportId ? { weeklyReportId: input.weeklyReportId } : {}),
      ...(input.monthlyReportId ? { monthlyReportId: input.monthlyReportId } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata as object } : {}),
    },
  });

  // Auto-create intervention for HIGH and CRITICAL severity
  if (
    (input.severity === Severity.HIGH || input.severity === Severity.CRITICAL) &&
    input.autoAssignTo
  ) {
    await prisma.intervention.create({
      data: {
        alertId: alert.id,
        issueType: input.type,
        severity: input.severity,
        assignedToId: input.autoAssignTo,
        status: InterventionStatus.OPEN,
      },
    });
  }

  return { success: true, data: alert };
}
