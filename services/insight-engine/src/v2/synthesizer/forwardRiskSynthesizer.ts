import type {
  ForecastedTrend,
  RecurrenceRisk,
  RiskEscalationForecast,
  ForwardRiskSignal,
  ForecastHorizon,
} from "@orgos/shared-types";

/**
 * Combines trend forecasts, recurrence risks, and escalation paths into a
 * unified set of forward-looking risk signals ranked by likelihood × impact.
 *
 * Pure function — no DB access.
 */
export function synthesizeForwardRisks(
  trends: ForecastedTrend[],
  recurrences: RecurrenceRisk[],
  escalations: RiskEscalationForecast[]
): ForwardRiskSignal[] {
  const signals: ForwardRiskSignal[] = [];

  // Risk signals from recurrence — "this anomaly is likely to happen again"
  for (const r of recurrences) {
    if (r.probabilityNext7Days < 0.2 && r.probabilityNext30Days < 0.4) continue;

    const horizon: ForecastHorizon = r.probabilityNext7Days >= 0.5 ? "7D"
      : r.probabilityNext7Days >= 0.2 ? "14D"
      : "30D";

    signals.push({
      category: anomalyToCategory(r.anomalyType),
      likelihood: horizon === "7D" ? r.probabilityNext7Days : r.probabilityNext30Days,
      impact: r.historicalFrequency >= 5 ? "HIGH" : "MEDIUM",
      timeToManifest: horizon,
      confidence: Math.min(0.4 + r.historicalFrequency * 0.08, 0.85),
      description: `${r.anomalyType}${r.metricKey ? ` on ${r.metricKey}` : ""} has a ${(r.probabilityNext7Days * 100).toFixed(0)}% chance of recurring within 7 days based on historical frequency`,
    });
  }

  // Risk signals from trend projections — "metric is heading in a bad direction"
  for (const t of trends) {
    if (t.direction === "STABLE" || t.confidence < 0.4) continue;
    const isNegative = isNegativeTrend(t.metricKey, t.direction);
    if (!isNegative) continue;

    signals.push({
      category: metricToCategory(t.metricKey),
      likelihood: t.confidence,
      impact: t.projectedValue30Days < 0 ? "HIGH" : "MEDIUM",
      timeToManifest: "30D",
      confidence: t.confidence * t.volatilityDamping,
      description: `${t.metricKey} is projected to ${t.direction === "DOWN" ? "decline to" : "reach"} ${t.projectedValue30Days} within 30 days`,
    });
  }

  // Risk signals from escalations — "a current risk is going to get worse"
  for (const e of escalations) {
    signals.push({
      category: e.riskCategory,
      likelihood: e.confidence,
      impact: e.projectedSeverity,
      timeToManifest: e.horizon,
      confidence: e.confidence,
      description: `${e.riskCategory} risk may escalate from ${e.currentSeverity} to ${e.projectedSeverity} within ${e.horizon}: ${e.triggerConditions.join("; ")}`,
    });
  }

  // Sort: highest likelihood first, then soonest horizon
  return signals.sort((a, b) => {
    const horizonOrder: ForecastHorizon[] = ["7D", "14D", "30D"];
    const likelihoodDiff = b.likelihood - a.likelihood;
    if (Math.abs(likelihoodDiff) > 0.05) return likelihoodDiff;
    return horizonOrder.indexOf(a.timeToManifest) - horizonOrder.indexOf(b.timeToManifest);
  });
}

function anomalyToCategory(type: string): ForwardRiskSignal["category"] {
  if (type === "MISSING_ENTRY") return "OPERATIONAL";
  if (type === "INCONSISTENCY")  return "DATA_QUALITY";
  if (type === "GAP")            return "DATA_QUALITY";
  return "OPERATIONAL";
}

function metricToCategory(metricKey: string): ForwardRiskSignal["category"] {
  if (metricKey === "engagement_score" || metricKey === "attendance_rate") return "ENGAGEMENT";
  if (metricKey === "dropout_count")  return "OPERATIONAL";
  if (metricKey === "output_count")   return "PERFORMANCE";
  return "OPERATIONAL";
}

function isNegativeTrend(metricKey: string, direction: "UP" | "DOWN" | "STABLE"): boolean {
  // For most metrics, DOWN is bad. dropout_count is the exception: UP is bad.
  if (metricKey === "dropout_count" || metricKey === "risk_flag" || metricKey === "blocker_present") {
    return direction === "UP";
  }
  return direction === "DOWN";
}
