import { randomUUID } from "node:crypto";
import type { ActionPlan, GovernanceDecision, GovernanceAuditEvent } from "@orgos/shared-types";
import { applyGovernancePolicy } from "./governancePolicyEngine.js";
import { getActiveBoardPolicy } from "./boardPolicies.js";
import { recordGovernanceAuditEvent } from "./auditLog.js";

export interface GuardResult {
  decision: GovernanceDecision;
  /** Modified plan if governance upgraded execution mode (e.g. AUTO → HUMAN_APPROVAL) */
  plan: ActionPlan;
}

/**
 * The final gate before any action is dispatched to the execution router.
 *
 * - Fetches the active board policy for the department
 * - Evaluates the plan through the governance policy engine
 * - Records an immutable audit event regardless of outcome
 * - If blocked, returns the decision so callers can enqueue for approval or discard
 * - If allowed and executionMode is AUTO but governance requires approval, upgrades the plan
 */
export async function guardAction(
  plan: ActionPlan,
  sourceLikelihood: number,
): Promise<GuardResult> {
  const policy = await getActiveBoardPolicy(plan.departmentId);
  const decision = applyGovernancePolicy(plan, policy, sourceLikelihood);

  // Upgrade AUTO → HUMAN_APPROVAL when governance requires human sign-off
  let guardedPlan = plan;
  if (decision.allowed && decision.requiredApprovalLevel !== null && plan.executionMode === "AUTO") {
    guardedPlan = { ...plan, executionMode: "HUMAN_APPROVAL" };
  }

  const auditEvent: GovernanceAuditEvent = {
    actionPlanId:     randomUUID(), // plans don't have IDs yet at this stage; DB row created on enqueue
    actionType:       plan.actionType,
    departmentId:     plan.departmentId,
    decision:         decision.allowed ? (decision.requiredApprovalLevel ? "ESCALATED" : "ALLOWED") : "BLOCKED",
    requiredLevel:    decision.requiredApprovalLevel,
    reason:           decision.reason,
    boardPolicyId:    policy.id === "default" ? null : policy.id,
    automationLevel:  policy.automationLevel,
    forecastRunId:    plan.forecastRunId,
    sourceLikelihood: sourceLikelihood,
  };

  await recordGovernanceAuditEvent(auditEvent);

  return { decision, plan: guardedPlan };
}
