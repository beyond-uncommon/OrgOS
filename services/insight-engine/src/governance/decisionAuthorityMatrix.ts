import type { OrgNode, ActionExecutionMode, ActionPriority } from "@orgos/shared-types";

/**
 * For a given priority + execution mode, returns the minimum OrgNode level
 * that has authority to approve the action.
 *
 * SYSTEM actions (data_audit, baseline_documentation) always route to SYSTEM node
 * and never require human approval.
 *
 * P0 HUMAN_APPROVAL actions require EXECUTIVE sign-off.
 * P1 HUMAN_APPROVAL actions require DEPARTMENT_HEAD.
 * P2/P3 HUMAN_APPROVAL actions require PROGRAM_LEAD.
 * AUTO actions do not require approval — they are gated by BoardPolicy.
 */
export function getRequiredApprovalLevel(
  priority: ActionPriority,
  executionMode: ActionExecutionMode,
): OrgNode | null {
  if (executionMode === "SYSTEM") return null;
  if (executionMode === "AUTO")   return null;

  // HUMAN_APPROVAL
  if (priority === 0) return "EXECUTIVE";
  if (priority === 1) return "DEPARTMENT_HEAD";
  return "PROGRAM_LEAD";
}

/**
 * Per-actionType overrides. Some actions always require a minimum level
 * regardless of priority, because of organizational policy sensitivity.
 */
const ACTION_TYPE_MINIMUM_LEVEL: Record<string, OrgNode> = {
  "student_engagement_intervention": "DEPARTMENT_HEAD",
  "instructor_engagement_review":    "DEPARTMENT_HEAD",
  "dropout_prevention_outreach":     "PROGRAM_LEAD",
  "data_audit":                      "SYSTEM",
  "baseline_documentation":          "SYSTEM",
  "engagement_opportunity_flag":     "PROGRAM_LEAD",
};

/** Returns the minimum OrgNode for a specific actionType, or null if no override */
export function getActionTypeMinimumLevel(actionType: string): OrgNode | null {
  return ACTION_TYPE_MINIMUM_LEVEL[actionType] ?? null;
}
