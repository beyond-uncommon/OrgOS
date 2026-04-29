import type { InsightContext, InsightCorrelation, AnomalyResult } from "@orgos/shared-types";
import type { MetricTrendSummary } from "../aggregators/metricTrendAggregator.js";
import type { AnomalyGroup } from "../aggregators/anomalyAggregator.js";

/**
 * Deterministic correlation rules — no LLM.
 * Confidence is derived from frequency overlap within the same time window.
 * Each rule returns null when the condition is not met.
 */
type CorrelationRule = (
  context: InsightContext,
  groups: AnomalyGroup,
  trends: MetricTrendSummary[]
) => InsightCorrelation | null;

const RULES: CorrelationRule[] = [
  // Attendance decline → dropout spike
  (_ctx, groups, trends) => {
    const dropoutSpikes = groups.byType.SPIKE.filter((a) => a.metricKey === "dropout_count");
    const attendanceTrend = trends.find((t) => t.metricKey === "attendance_rate");
    if (dropoutSpikes.length === 0 || !attendanceTrend || attendanceTrend.trend >= 0) return null;

    const supporting = [
      ...dropoutSpikes,
      ...(groups.byMetricKey["attendance_rate"] ?? []),
    ];

    return {
      cause: "Sustained decline in attendance_rate",
      effect: "Elevated dropout_count — disengagement likely preceding dropout",
      confidence: Math.min(0.6 + dropoutSpikes.length * 0.1, 0.9),
      supportingAnomalies: supporting,
    };
  },

  // Missing entries → engagement drop
  (_ctx, groups, trends) => {
    const missing = groups.byType.MISSING_ENTRY;
    const engagementTrend = trends.find((t) => t.metricKey === "engagement_score");
    if (missing.length < 2 || !engagementTrend || engagementTrend.trend >= 0) return null;

    return {
      cause: "Multiple missing daily entries",
      effect: "Correlated engagement_score decline — non-submission may reflect disengagement",
      confidence: Math.min(0.5 + missing.length * 0.08, 0.85),
      supportingAnomalies: missing,
    };
  },

  // Inconsistencies → risk_flag emergence
  (_ctx, groups, trends) => {
    const inconsistencies = groups.byType.INCONSISTENCY;
    const riskTrend = trends.find((t) => t.metricKey === "risk_flag");
    if (inconsistencies.length < 2 || !riskTrend || riskTrend.average <= 0.3) return null;

    return {
      cause: "Repeated cross-field inconsistencies in submitted data",
      effect: "Elevated risk_flag rate — data quality issues may mask operational problems",
      confidence: 0.65,
      supportingAnomalies: inconsistencies,
    };
  },

  // Systemic: dropout + attendance + missing entries co-occur
  (_ctx, groups) => {
    const hasDropout = (groups.byMetricKey["dropout_count"] ?? []).length > 0;
    const hasAttendance = (groups.byMetricKey["attendance_rate"] ?? []).length > 0;
    const hasMissing = groups.byType.MISSING_ENTRY.length > 0;
    if (!hasDropout || !hasAttendance || !hasMissing) return null;

    const supporting: AnomalyResult[] = [
      ...(groups.byMetricKey["dropout_count"] ?? []),
      ...(groups.byMetricKey["attendance_rate"] ?? []),
      ...groups.byType.MISSING_ENTRY,
    ];

    return {
      cause: "Co-occurring dropout spike, attendance decline, and missing entries",
      effect: "Systemic operational issue — multiple independent signals converging",
      confidence: 0.9,
      supportingAnomalies: supporting,
    };
  },
];

export function detectCorrelations(
  context: InsightContext,
  groups: AnomalyGroup,
  trends: MetricTrendSummary[]
): InsightCorrelation[] {
  return RULES.flatMap((rule) => {
    const result = rule(context, groups, trends);
    return result ? [result] : [];
  });
}
