import type { ForwardRiskSignal, OpportunitySignal, RiskEscalationForecast } from "@orgos/shared-types";

/**
 * Derives pre-emptive actions from forward risks, escalations, and opportunities.
 * Deterministic rules only — all outputs trace back to a specific input signal.
 */
export function generatePreemptiveRecommendations(
  forwardRisks: ForwardRiskSignal[],
  escalations: RiskEscalationForecast[],
  opportunities: OpportunitySignal[]
): string[] {
  const recs: string[] = [];

  // Imminent high-likelihood risks (7D horizon, >60% probability)
  const imminent = forwardRisks.filter(
    (r) => r.timeToManifest === "7D" && r.likelihood >= 0.6
  );
  if (imminent.length > 0) {
    recs.push(
      `Address ${imminent.map((r) => r.category).join(" and ")} risk within 7 days — probability of occurrence exceeds 60%`
    );
  }

  // Escalation prevention
  for (const e of escalations) {
    if (e.projectedSeverity === "CRITICAL") {
      recs.push(
        `Intervene on ${e.riskCategory} risk now to prevent escalation to CRITICAL within ${e.horizon}: ${e.triggerConditions[0]}`
      );
    } else if (e.projectedSeverity === "HIGH" && e.horizon === "14D") {
      recs.push(
        `Monitor ${e.riskCategory} closely — projected to reach HIGH severity within 14 days if current trends continue`
      );
    }
  }

  // Engagement pre-emption
  const engagementRisk = forwardRisks.find(
    (r) => r.category === "ENGAGEMENT" && r.likelihood > 0.5
  );
  if (engagementRisk) {
    recs.push(
      "Schedule proactive staff engagement session before engagement decline manifests — early intervention is 3× more effective than reactive"
    );
  }

  // Opportunity leverage
  for (const opp of opportunities) {
    if (opp.confidence < 0.6) continue;
    if (opp.type === "SCALING_READINESS") {
      recs.push("Evaluate cohort expansion — attendance and stability indicators suggest readiness for increased intake");
    }
    if (opp.type === "DROPOUT_REDUCTION") {
      recs.push("Document and replicate practices driving dropout reduction — capture the signal before conditions change");
    }
    if (opp.type === "PROCESS_OPTIMIZATION") {
      recs.push("Formalize current processes — output is improving steadily, making this the right time to standardize practices");
    }
  }

  return [...new Set(recs)];
}
