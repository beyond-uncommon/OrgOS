import type { InsightPattern, AnomalyResult } from "@orgos/shared-types";
import type { AnomalyGroup } from "../aggregators/anomalyAggregator.js";
import type { MetricTrendSummary } from "../aggregators/metricTrendAggregator.js";

const SPIKE_REPEAT_THRESHOLD = 2;
const MISSING_CLUSTER_THRESHOLD = 3;
const INCONSISTENCY_CLUSTER_THRESHOLD = 2;

/**
 * All detectors require at least 2 anomalies to form a pattern.
 * No DB access — operates on pre-aggregated data only.
 */
export function detectPatterns(
  groups: AnomalyGroup,
  trends: MetricTrendSummary[]
): InsightPattern[] {
  return [
    ...detectRepeatedSpikes(groups),
    ...detectSustainedDeclines(trends),
    ...detectMissingEntryCluster(groups),
    ...detectInconsistencyCluster(groups),
    ...detectInstabilityPatterns(groups, trends),
  ];
}

function detectRepeatedSpikes(groups: AnomalyGroup): InsightPattern[] {
  const patterns: InsightPattern[] = [];

  for (const [metricKey, anomalies] of Object.entries(groups.byMetricKey)) {
    const spikes = anomalies.filter((a) => a.anomalyType === "SPIKE");
    if (spikes.length < SPIKE_REPEAT_THRESHOLD) continue;

    patterns.push({
      type: "TREND",
      severity: spikes.length >= 4 ? "HIGH" : "MEDIUM",
      description: `${metricKey} spiked ${spikes.length} times in this window — systemic shift, not an isolated event`,
      evidence: spikes,
    });
  }

  return patterns;
}

function detectSustainedDeclines(trends: MetricTrendSummary[]): InsightPattern[] {
  return trends
    .filter((t) => t.weekOverWeekDelta < -0.1 && t.dataPoints >= 3)
    .map((t) => ({
      type: "TREND" as const,
      severity: (t.weekOverWeekDelta < -0.3 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
      description: `${t.metricKey} declined ${Math.abs(t.weekOverWeekDelta * 100).toFixed(1)}% second-half vs first-half of window`,
      evidence: [] as AnomalyResult[],
    }));
}

function detectMissingEntryCluster(groups: AnomalyGroup): InsightPattern[] {
  const missing = groups.byType.MISSING_ENTRY;
  if (missing.length < MISSING_CLUSTER_THRESHOLD) return [];

  const byUser = groupBy(missing, (a) => a.userId ?? "unknown");
  const repeatOffenders = Object.values(byUser).filter((g) => g.length > 1);

  return [
    {
      type: "BEHAVIOR_SHIFT",
      severity: missing.length >= 6 ? "HIGH" : "MEDIUM",
      description: `${missing.length} missing entries detected${repeatOffenders.length > 0 ? `, ${repeatOffenders.length} user(s) missing on multiple days` : ""}`,
      evidence: missing,
    },
  ];
}

function detectInconsistencyCluster(groups: AnomalyGroup): InsightPattern[] {
  const inconsistencies = groups.byType.INCONSISTENCY;
  if (inconsistencies.length < INCONSISTENCY_CLUSTER_THRESHOLD) return [];

  return [
    {
      type: "RISK_CLUSTER",
      severity: inconsistencies.length >= 4 ? "HIGH" : "MEDIUM",
      description: `${inconsistencies.length} cross-field inconsistencies — data reliability may be compromised`,
      evidence: inconsistencies,
    },
  ];
}

function detectInstabilityPatterns(
  groups: AnomalyGroup,
  trends: MetricTrendSummary[]
): InsightPattern[] {
  // High volatility + anomalies on same metric = instability
  return trends
    .filter((t) => {
      const hasAnomalies = (groups.byMetricKey[t.metricKey as never] ?? []).length >= 2;
      return t.volatility > 0.5 && hasAnomalies;
    })
    .map((t) => ({
      type: "TREND" as const,
      severity: "MEDIUM" as const,
      description: `${t.metricKey} shows high volatility (σ=${t.volatility.toFixed(2)}) with repeated anomalies — unstable signal`,
      evidence: groups.byMetricKey[t.metricKey as never] ?? [],
    }));
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}
