import type { ForecastedTrend, OpportunitySignal, OpportunityType } from "@orgos/shared-types";
import type { MetricTrendSummary } from "../../aggregators/metricTrendAggregator.js";

/**
 * Detects positive leverage signals from forecasted trends and historical summaries.
 * Only fires when confidence is sufficient — avoids false optimism on noisy data.
 *
 * Pure function — no DB access.
 */
export function detectOpportunities(
  trends: ForecastedTrend[],
  summaries: MetricTrendSummary[]
): OpportunitySignal[] {
  const opportunities: OpportunitySignal[] = [];
  const summaryMap = new Map(summaries.map((s) => [s.metricKey, s]));

  for (const t of trends) {
    if (t.confidence < 0.5) continue;

    const summary = summaryMap.get(t.metricKey);
    const result = evaluateOpportunity(t, summary);
    if (result) opportunities.push(result);
  }

  return opportunities;
}

function evaluateOpportunity(
  trend: ForecastedTrend,
  summary: MetricTrendSummary | undefined
): OpportunitySignal | null {
  const { metricKey, direction, confidence, projectedValue30Days, volatilityDamping } = trend;

  // Engagement improving
  if (metricKey === "engagement_score" && direction === "UP") {
    return signal("ENGAGEMENT_IMPROVEMENT", metricKey, confidence * volatilityDamping, {
      description: `engagement_score is projected to reach ${projectedValue30Days} — sustained improvement indicates growing staff motivation`,
      expectedBenefit: "Lower dropout risk, better output quality, higher attendance stability",
    });
  }

  // Dropout reducing
  if (metricKey === "dropout_count" && direction === "DOWN") {
    return signal("DROPOUT_REDUCTION", metricKey, confidence * volatilityDamping, {
      description: `dropout_count is trending down and projected at ${projectedValue30Days} — retention is improving`,
      expectedBenefit: "Cohort stability, reduced intervention load, stronger completion rates",
    });
  }

  // Metric stability — low volatility + stable direction
  if (summary && summary.volatility < 0.15 && direction === "STABLE" && summary.dataPoints >= 5) {
    return signal("METRIC_STABILITY", metricKey, confidence, {
      description: `${metricKey} is stable (σ=${summary.volatility.toFixed(2)}) — predictable baseline established`,
      expectedBenefit: "Reliable baseline for anomaly detection, reduced alert noise",
    });
  }

  // Scaling readiness — attendance high and stable
  if (
    metricKey === "attendance_rate" &&
    direction === "UP" &&
    (summary?.average ?? 0) > 80
  ) {
    return signal("SCALING_READINESS", metricKey, confidence * 0.8, {
      description: `attendance_rate is high and rising — department may be ready for cohort expansion`,
      expectedBenefit: "Opportunity to scale intake without operational strain",
    });
  }

  // Process optimization — output rising with stable engagement
  if (metricKey === "output_count" && direction === "UP" && confidence > 0.65) {
    return signal("PROCESS_OPTIMIZATION", metricKey, confidence * volatilityDamping, {
      description: `output_count is projected to reach ${projectedValue30Days} — sustained productivity improvement suggests process maturity`,
      expectedBenefit: "Capacity for increased targets, documentation of effective practices",
    });
  }

  return null;
}

function signal(
  type: OpportunityType,
  metricKey: string,
  confidence: number,
  rest: { description: string; expectedBenefit: string }
): OpportunitySignal {
  return { type, metricKey, confidence: Math.min(confidence, 0.9), ...rest };
}
