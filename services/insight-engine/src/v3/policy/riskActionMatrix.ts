import type { ForwardRiskSignal, ActionPlan, ActionExecutionMode, ActionUrgency, ActionPriority } from "@orgos/shared-types";

interface RiskActionMapping {
  actionType: string;
  executionMode: ActionExecutionMode;
  urgency: ActionUrgency;
}

/**
 * Maps forward risk signals to action types, execution modes, and urgency.
 * Deterministic — no branching on probability here (that's the policy engine's job).
 */
const RISK_ACTION_MAP: Record<string, RiskActionMapping> = {
  OPERATIONAL: {
    actionType:    "student_engagement_intervention",
    executionMode: "HUMAN_APPROVAL",
    urgency:       "24H",
  },
  ENGAGEMENT: {
    actionType:    "instructor_engagement_review",
    executionMode: "HUMAN_APPROVAL",
    urgency:       "24H",
  },
  PERFORMANCE: {
    actionType:    "workload_review",
    executionMode: "HUMAN_APPROVAL",
    urgency:       "7D",
  },
  DATA_QUALITY: {
    actionType:    "data_audit",
    executionMode: "SYSTEM",
    urgency:       "7D",
  },
};

export function mapRiskToAction(
  risk: ForwardRiskSignal,
  departmentId: string,
  forecastRunId: string
): Omit<ActionPlan, "rationale" | "expiresAt"> {
  const mapping = RISK_ACTION_MAP[risk.category] ?? {
    actionType:    "generic_review",
    executionMode: "HUMAN_APPROVAL" as ActionExecutionMode,
    urgency:       "7D" as ActionUrgency,
  };

  const priority = impactToPriority(risk.impact);

  return {
    actionType:    mapping.actionType,
    target:        departmentId,
    priority,
    urgency:       mapping.urgency,
    executionMode: mapping.executionMode,
    payload: {
      riskCategory: risk.category,
      likelihood:   risk.likelihood,
      impact:       risk.impact,
      horizon:      risk.timeToManifest,
      description:  risk.description,
    },
    forecastRunId,
    departmentId,
  };
}

function impactToPriority(impact: ForwardRiskSignal["impact"]): ActionPriority {
  if (impact === "CRITICAL") return 0;
  if (impact === "HIGH")     return 1;
  if (impact === "MEDIUM")   return 2;
  return 3;
}
