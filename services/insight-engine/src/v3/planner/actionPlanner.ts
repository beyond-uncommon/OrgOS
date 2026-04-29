import type { DecisionSignal, ActionPlan, ForwardRiskSignal, OpportunitySignal } from "@orgos/shared-types";
import { mapRiskToAction } from "../policy/riskActionMatrix.js";
import { mapOpportunityToAction } from "../policy/opportunityActionMatrix.js";

const URGENCY_TTL_MS: Record<string, number> = {
  IMMEDIATE: 4 * 60 * 60 * 1000,      // 4 hours
  "24H":     24 * 60 * 60 * 1000,
  "7D":      7  * 24 * 60 * 60 * 1000,
};

/**
 * Transforms a DecisionSignal into a fully-specified ActionPlan.
 * MONITOR decisions produce no plan — they are logged but not queued.
 *
 * Pure function — no DB access.
 */
export function planAction(
  decision: DecisionSignal,
  departmentId: string,
  forecastRunId: string
): ActionPlan | null {
  if (decision.type === "MONITOR") return null;

  const isRisk = isForwardRiskSignal(decision.sourceSignal);

  const base = isRisk
    ? mapRiskToAction(decision.sourceSignal as ForwardRiskSignal, departmentId, forecastRunId)
    : mapOpportunityToAction(decision.sourceSignal as OpportunitySignal, departmentId, forecastRunId);

  // ESCALATE overrides execution mode — escalations always require human approval
  const executionMode = decision.type === "ESCALATE" ? "HUMAN_APPROVAL" : base.executionMode;

  const expiresAt = new Date(Date.now() + (URGENCY_TTL_MS[base.urgency] ?? URGENCY_TTL_MS["7D"]));

  return {
    ...base,
    executionMode,
    rationale: decision.rationale,
    expiresAt,
  };
}

function isForwardRiskSignal(signal: ForwardRiskSignal | OpportunitySignal): boolean {
  return "likelihood" in signal;
}
