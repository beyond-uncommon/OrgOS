import { log, logError } from "@orgos/utils";
import type { ActionPlan } from "@orgos/shared-types";
import { ActionEvents } from "../config/actionEventTypes.js";
import { enqueueForApproval } from "./humanApprovalQueue.js";
import { executeAutomatedAction } from "./automatedExecutor.js";
import { guardAction } from "../../governance/executionGuard.js";

export interface RoutingResult {
  actionType:    string;
  executionMode: string;
  outcome:       "QUEUED" | "EXECUTED" | "BLOCKED";
  pendingActionId?: string;
  blockReason?: string;
}

/**
 * Routes each ActionPlan through the governance guard, then to the correct executor.
 *
 * Governance gate (executionGuard) runs first — always.
 * AUTO     → automatedExecutor (safe, non-destructive ops only)
 * SYSTEM   → humanApprovalQueue (system changes still audited)
 * HUMAN_APPROVAL → humanApprovalQueue (nothing executes without explicit approval)
 * BLOCKED  → action discarded; audit record written; no execution
 */
export async function routeAction(plan: ActionPlan, sourceLikelihood = 0): Promise<RoutingResult> {
  const { decision, plan: guardedPlan } = await guardAction(plan, sourceLikelihood);

  if (!decision.allowed) {
    log(ActionEvents.BLOCKED_BY_GOVERNANCE, {
      actionType:   plan.actionType,
      departmentId: plan.departmentId,
      reason:       decision.reason,
    });
    return { actionType: plan.actionType, executionMode: plan.executionMode, outcome: "BLOCKED", blockReason: decision.reason };
  }

  log(ActionEvents.ROUTING, {
    actionType:    guardedPlan.actionType,
    executionMode: guardedPlan.executionMode,
    priority:      guardedPlan.priority,
    departmentId:  guardedPlan.departmentId,
  });

  switch (guardedPlan.executionMode) {
    case "AUTO": {
      await executeAutomatedAction(guardedPlan);
      return { actionType: guardedPlan.actionType, executionMode: "AUTO", outcome: "EXECUTED" };
    }

    case "HUMAN_APPROVAL":
    case "SYSTEM": {
      const pendingActionId = await enqueueForApproval(guardedPlan);
      log(ActionEvents.QUEUED_FOR_APPROVAL, {
        pendingActionId,
        actionType:   guardedPlan.actionType,
        priority:     guardedPlan.priority,
        urgency:      guardedPlan.urgency,
        departmentId: guardedPlan.departmentId,
      });
      return { actionType: guardedPlan.actionType, executionMode: guardedPlan.executionMode, outcome: "QUEUED", pendingActionId };
    }
  }
}
