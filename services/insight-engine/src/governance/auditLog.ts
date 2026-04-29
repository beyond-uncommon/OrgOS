import { prisma } from "@orgos/db";
import type { GovernanceAuditEvent } from "@orgos/shared-types";

/**
 * Writes an immutable governance audit record.
 * Called by the execution guard after every governance evaluation — allowed or not.
 */
export async function recordGovernanceAuditEvent(event: GovernanceAuditEvent): Promise<void> {
  await prisma.governanceAuditRecord.create({
    data: {
      actionPlanId:     event.actionPlanId,
      actionType:       event.actionType,
      departmentId:     event.departmentId,
      decision:         event.decision,
      requiredLevel:    event.requiredLevel ?? null,
      reason:           event.reason,
      boardPolicyId:    event.boardPolicyId,
      automationLevel:  event.automationLevel,
      forecastRunId:    event.forecastRunId,
      sourceLikelihood: event.sourceLikelihood,
    },
  });
}
