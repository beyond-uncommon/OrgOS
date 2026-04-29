import type { InsightPattern, InsightCorrelation, RiskSignal, AnomalyResult } from "@orgos/shared-types";
import type { MetricTrendSummary } from "../aggregators/metricTrendAggregator.js";
import type { AnomalyGroup } from "../aggregators/anomalyAggregator.js";

export function synthesizeRisks(
  patterns: InsightPattern[],
  correlations: InsightCorrelation[],
  trends: MetricTrendSummary[],
  groups: AnomalyGroup
): RiskSignal[] {
  const risks: RiskSignal[] = [];

  // OPERATIONAL — dropout spikes or spike clusters
  const operationalPatterns = patterns.filter(
    (p) => p.type === "TREND" && p.evidence.some((e) => e.metricKey === "dropout_count")
  );
  if (operationalPatterns.length > 0) {
    risks.push({
      category: "OPERATIONAL",
      severity: operationalPatterns.some((p) => p.severity === "HIGH") ? "HIGH" : "MEDIUM",
      description: "Recurring dropout spikes indicate operational instability — cohort retention is at risk",
      evidence: operationalPatterns.flatMap((p) => p.evidence),
    });
  }

  // ENGAGEMENT — attendance decline or low engagement average
  const attendanceTrend = trends.find((t) => t.metricKey === "attendance_rate");
  const engagementTrend = trends.find((t) => t.metricKey === "engagement_score");
  const missingPattern = patterns.find((p) => p.type === "BEHAVIOR_SHIFT");

  if (
    missingPattern ||
    (attendanceTrend && attendanceTrend.weekOverWeekDelta < -0.1) ||
    (engagementTrend && engagementTrend.average < 0.8)
  ) {
    const evidence: AnomalyResult[] = [
      ...(missingPattern?.evidence ?? []),
      ...(groups.byMetricKey["attendance_rate"] ?? []),
      ...(groups.byMetricKey["engagement_score"] ?? []),
    ];
    risks.push({
      category: "ENGAGEMENT",
      severity: missingPattern?.severity === "HIGH" ? "HIGH" : "MEDIUM",
      description: "Engagement indicators are declining — attendance, submissions, or engagement scores show downward trend",
      evidence,
    });
  }

  // PERFORMANCE — output count decline
  const outputTrend = trends.find((t) => t.metricKey === "output_count");
  if (outputTrend && outputTrend.weekOverWeekDelta < -0.15) {
    risks.push({
      category: "PERFORMANCE",
      severity: outputTrend.weekOverWeekDelta < -0.3 ? "HIGH" : "MEDIUM",
      description: `output_count declined ${Math.abs(outputTrend.weekOverWeekDelta * 100).toFixed(0)}% this window — productivity is falling`,
      evidence: groups.byMetricKey["output_count"] ?? [],
    });
  }

  // DATA_QUALITY — inconsistency cluster
  const inconsistencyPattern = patterns.find((p) => p.type === "RISK_CLUSTER");
  if (inconsistencyPattern) {
    risks.push({
      category: "DATA_QUALITY",
      severity: inconsistencyPattern.severity === "HIGH" ? "HIGH" : "MEDIUM",
      description: "Data quality is degraded — cross-field contradictions suggest input errors or misreporting",
      evidence: inconsistencyPattern.evidence,
    });
  }

  // CRITICAL escalation — high-confidence systemic correlation
  const systemicCorrelation = correlations.find((c) => c.confidence >= 0.85);
  if (systemicCorrelation) {
    risks.push({
      category: "OPERATIONAL",
      severity: "CRITICAL",
      description: `Systemic risk: ${systemicCorrelation.effect}`,
      evidence: systemicCorrelation.supportingAnomalies,
    });
  }

  return risks;
}
