import type { InsightForecast, DecisionSignal, ForwardRiskSignal, OpportunitySignal } from "@orgos/shared-types";

const ESCALATE_LIKELIHOOD_THRESHOLD = 0.75;
const INTERVENE_LIKELIHOOD_MIN      = 0.4;
const OPPORTUNITY_CONFIDENCE_MIN    = 0.6;
const IGNORE_CONFIDENCE_MAX         = 0.4;

/**
 * Applies deterministic policy rules to an InsightForecast.
 * Returns one DecisionSignal per actionable signal — signals below confidence
 * thresholds are dropped (IGNORE) and never reach the action planner.
 *
 * Pure function — no DB access, no side effects.
 */
export function applyDecisionPolicy(forecast: InsightForecast): DecisionSignal[] {
  const decisions: DecisionSignal[] = [];

  for (const risk of forecast.forwardRisks) {
    const signal = evaluateRisk(risk);
    if (signal) decisions.push(signal);
  }

  for (const opp of forecast.opportunities) {
    const signal = evaluateOpportunity(opp);
    if (signal) decisions.push(signal);
  }

  return decisions;
}

function evaluateRisk(risk: ForwardRiskSignal): DecisionSignal | null {
  // Drop signals we can't act on reliably
  if (risk.confidence < IGNORE_CONFIDENCE_MAX) return null;

  if (risk.likelihood > ESCALATE_LIKELIHOOD_THRESHOLD &&
      (risk.impact === "HIGH" || risk.impact === "CRITICAL")) {
    return {
      type:         "ESCALATE",
      confidence:   risk.confidence,
      rationale:    `${risk.category} risk has ${(risk.likelihood * 100).toFixed(0)}% probability with ${risk.impact} impact — immediate escalation required`,
      sourceSignal: risk,
    };
  }

  if (risk.likelihood >= INTERVENE_LIKELIHOOD_MIN) {
    return {
      type:         "INTERVENE",
      confidence:   risk.confidence,
      rationale:    `${risk.category} risk has ${(risk.likelihood * 100).toFixed(0)}% probability — proactive intervention warranted`,
      sourceSignal: risk,
    };
  }

  return {
    type:         "MONITOR",
    confidence:   risk.confidence,
    rationale:    `${risk.category} risk is below intervention threshold (${(risk.likelihood * 100).toFixed(0)}% probability) — monitor without action`,
    sourceSignal: risk,
  };
}

function evaluateOpportunity(opp: OpportunitySignal): DecisionSignal | null {
  if (opp.confidence < OPPORTUNITY_CONFIDENCE_MIN) return null;

  return {
    type:         "MONITOR",       // opportunities use MONITOR — no escalation path
    confidence:   opp.confidence,
    rationale:    `Opportunity detected: ${opp.type} with ${(opp.confidence * 100).toFixed(0)}% confidence — act to capture upside`,
    sourceSignal: opp,
  };
}
