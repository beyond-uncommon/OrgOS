import type { ActionPlan, BoardPolicy, GovernanceDecision, OrgNode } from "@orgos/shared-types";
import { getRequiredApprovalLevel, getActionTypeMinimumLevel } from "./decisionAuthorityMatrix.js";
import { buildEscalationPath, hasAuthority } from "./orgStructure.js";

/**
 * Evaluates an ActionPlan against the active BoardPolicy and returns a GovernanceDecision.
 *
 * Pure function — no DB access. Callers are responsible for fetching the policy.
 *
 * Rules (evaluated in order):
 * 1. LOCKED automation → block everything that isn't SYSTEM
 * 2. Forbidden action types → always blocked
 * 3. AUTO actions under FULL or LIMITED:
 *    - Must be in allowedAutoActions list (under LIMITED)
 *    - Source likelihood must not exceed maxAutoRiskThreshold
 * 4. HUMAN_APPROVAL → determine required approval level from authority matrix
 * 5. SYSTEM → always allowed, no approval needed
 */
export function applyGovernancePolicy(
  plan: ActionPlan,
  policy: BoardPolicy,
  sourceLikelihood: number,
): GovernanceDecision {
  // Rule 1: kill switch
  if (policy.automationLevel === "LOCKED" && plan.executionMode !== "SYSTEM") {
    return {
      allowed: false,
      requiredApprovalLevel: "BOARD",
      escalationPath: ["BOARD"],
      reason: "Automation is LOCKED by board policy. All non-SYSTEM actions require board review.",
    };
  }

  // Rule 2: forbidden action types
  if (policy.forbiddenActions.includes(plan.actionType)) {
    return {
      allowed: false,
      requiredApprovalLevel: "BOARD",
      escalationPath: ["BOARD"],
      reason: `Action type "${plan.actionType}" is explicitly forbidden by board policy.`,
    };
  }

  // Rule 3: SYSTEM actions — always allowed
  if (plan.executionMode === "SYSTEM") {
    return { allowed: true, requiredApprovalLevel: null, escalationPath: [], reason: "SYSTEM actions bypass governance." };
  }

  // Rule 4: AUTO actions
  if (plan.executionMode === "AUTO") {
    if (policy.automationLevel === "LIMITED" && !policy.allowedAutoActions.includes(plan.actionType)) {
      const required: OrgNode = "DEPARTMENT_HEAD";
      return {
        allowed: false,
        requiredApprovalLevel: required,
        escalationPath: buildEscalationPath(required),
        reason: `Action type "${plan.actionType}" is not in the allowedAutoActions list for LIMITED automation.`,
      };
    }

    if (sourceLikelihood > policy.maxAutoRiskThreshold) {
      const required: OrgNode = "DEPARTMENT_HEAD";
      return {
        allowed: false,
        requiredApprovalLevel: required,
        escalationPath: buildEscalationPath(required),
        reason: `Risk likelihood ${sourceLikelihood.toFixed(2)} exceeds AUTO threshold ${policy.maxAutoRiskThreshold.toFixed(2)}.`,
      };
    }

    return { allowed: true, requiredApprovalLevel: null, escalationPath: [], reason: "AUTO action approved by governance policy." };
  }

  // Rule 5: HUMAN_APPROVAL — determine authority level
  const matrixLevel  = getRequiredApprovalLevel(plan.priority, plan.executionMode);
  const overrideLevel = getActionTypeMinimumLevel(plan.actionType);

  let required: OrgNode = matrixLevel ?? "PROGRAM_LEAD";

  // Take the higher-authority requirement (lower index in hierarchy)
  if (overrideLevel && hasAuthority(overrideLevel, required)) {
    required = overrideLevel;
  }

  return {
    allowed: true,
    requiredApprovalLevel: required,
    escalationPath: buildEscalationPath(required),
    reason: `Action requires approval at ${required} level or above.`,
  };
}
