import type { AnomalyResult, AnomalyType, MetricKey } from "@orgos/shared-types";

export interface AnomalyGroup {
  byType: Record<AnomalyType, AnomalyResult[]>;
  byMetricKey: Partial<Record<MetricKey, AnomalyResult[]>>;
  /** How many times each metricKey appears across all anomaly types */
  metricFrequency: Partial<Record<MetricKey, number>>;
  totalCount: number;
}

/**
 * Flattens and groups anomalies for fast lookup by downstream analyzers.
 * Pure function — no DB access, no interpretation.
 */
export function aggregateAnomalies(anomalies: AnomalyResult[]): AnomalyGroup {
  const byType = {
    SPIKE: [],
    GAP: [],
    INCONSISTENCY: [],
    MISSING_ENTRY: [],
  } as Record<AnomalyType, AnomalyResult[]>;

  const byMetricKey: Partial<Record<MetricKey, AnomalyResult[]>> = {};
  const metricFrequency: Partial<Record<MetricKey, number>> = {};

  for (const anomaly of anomalies) {
    byType[anomaly.anomalyType].push(anomaly);

    if (anomaly.metricKey) {
      const key = anomaly.metricKey;
      (byMetricKey[key] ??= []).push(anomaly);
      metricFrequency[key] = (metricFrequency[key] ?? 0) + 1;
    }
  }

  return { byType, byMetricKey, metricFrequency, totalCount: anomalies.length };
}
