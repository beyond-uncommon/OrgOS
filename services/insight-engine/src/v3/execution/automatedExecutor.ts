import { prisma } from "@orgos/db";
import { log } from "@orgos/utils";
import type { ActionPlan } from "@orgos/shared-types";
import { ActionEvents } from "../config/actionEventTypes.js";

/**
 * Executes only safe, non-destructive, reversible operations.
 * Any action that affects a human (notifications, interventions, changes to
 * operational state) must go through humanApprovalQueue instead.
 *
 * Permitted operations:
 * - DashboardSnapshot creation
 * - Metric tagging (flagging)
 * - Structured log events
 * - Baseline documentation records
 */
export async function executeAutomatedAction(plan: ActionPlan): Promise<void> {
  if (plan.executionMode !== "AUTO") {
    throw new Error(`executeAutomatedAction called with executionMode=${plan.executionMode} — only AUTO plans are permitted here`);
  }

  switch (plan.actionType) {
    case "baseline_documentation": {
      await prisma.dashboardSnapshot.create({
        data: {
          departmentId: plan.departmentId,
          scope:        "DEPARTMENT",
          periodType:   "DAILY",
          periodStart:  new Date(),
          data: {
            type:         "BASELINE_RECORD",
            forecastRunId: plan.forecastRunId,
            payload:       plan.payload,
          },
        },
      });
      break;
    }

    case "engagement_opportunity_flag": {
      log(ActionEvents.AUTO_EXECUTED, {
        actionType:    plan.actionType,
        departmentId:  plan.departmentId,
        forecastRunId: plan.forecastRunId,
        payload:       plan.payload,
      });
      break;
    }

    default: {
      // Unknown AUTO action — log and skip rather than throw; keeps pipeline non-blocking
      log(ActionEvents.AUTO_SKIPPED, {
        actionType:    plan.actionType,
        departmentId:  plan.departmentId,
        reason:        "no handler registered for this actionType",
      });
      return;
    }
  }

  await prisma.pendingAction.updateMany({
    where: {
      forecastRunId: plan.forecastRunId,
      actionType:    plan.actionType,
      departmentId:  plan.departmentId,
      status:        "PENDING",
    },
    data: { status: "EXECUTED", executedAt: new Date() },
  });
}
