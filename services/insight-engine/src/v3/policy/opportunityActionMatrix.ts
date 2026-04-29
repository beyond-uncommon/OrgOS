import type { OpportunitySignal, ActionPlan, ActionExecutionMode } from "@orgos/shared-types";

interface OpportunityActionMapping {
  actionType: string;
  executionMode: ActionExecutionMode;
}

const OPPORTUNITY_ACTION_MAP: Record<string, OpportunityActionMapping> = {
  SCALING_READINESS:    { actionType: "cohort_expansion_review",    executionMode: "HUMAN_APPROVAL" },
  DROPOUT_REDUCTION:    { actionType: "practice_documentation",     executionMode: "SYSTEM" },
  ENGAGEMENT_IMPROVEMENT: { actionType: "engagement_opportunity_flag", executionMode: "SYSTEM" },
  PROCESS_OPTIMIZATION: { actionType: "process_standardization",   executionMode: "HUMAN_APPROVAL" },
  METRIC_STABILITY:     { actionType: "baseline_documentation",    executionMode: "AUTO" },
};

export function mapOpportunityToAction(
  opportunity: OpportunitySignal,
  departmentId: string,
  forecastRunId: string
): Omit<ActionPlan, "rationale" | "expiresAt"> {
  const mapping = OPPORTUNITY_ACTION_MAP[opportunity.type] ?? {
    actionType:    "opportunity_review",
    executionMode: "SYSTEM" as ActionExecutionMode,
  };

  return {
    actionType:    mapping.actionType,
    target:        departmentId,
    priority:      3, // P3 — all opportunities are lowest priority
    urgency:       "7D",
    executionMode: mapping.executionMode,
    payload: {
      opportunityType:  opportunity.type,
      description:      opportunity.description,
      expectedBenefit:  opportunity.expectedBenefit,
      confidence:       opportunity.confidence,
    },
    forecastRunId,
    departmentId,
  };
}
