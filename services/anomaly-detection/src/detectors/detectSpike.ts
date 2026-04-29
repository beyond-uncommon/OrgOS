import type { DailyEntry, ExtractedMetric } from "@orgos/shared-types";
import type { AnomalyResult } from "@orgos/shared-types";
import { normalizeEngagementScore } from "@orgos/utils";
import { SPIKE_THRESHOLDS } from "../config/thresholds.js";
import { isSpikeEligible } from "../config/metricCapabilities.js";

const DETECTION_WINDOW = "14d";
const MIN_HISTORY_POINTS = 3;
const MIN_CONFIDENCE = 0.7;

interface DetectSpikeInput {
  entry: DailyEntry;
  currentMetrics: ExtractedMetric[];
  history: ExtractedMetric[];
}

export function detectSpike({ entry, currentMetrics, history }: DetectSpikeInput): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  const eligibleCurrent = currentMetrics.filter(
    (m) => isSpikeEligible(m.metricKey as never) && !m.flagged && m.confidence >= MIN_CONFIDENCE
  );

  for (const metric of eligibleCurrent) {
    const key = metric.metricKey as keyof typeof SPIKE_THRESHOLDS;
    const threshold = SPIKE_THRESHOLDS[key];
    if (!threshold) continue;

    const historicalValues = history
      .filter((h) => h.metricKey === key && !h.flagged && h.confidence >= MIN_CONFIDENCE)
      .map((h) => toNumeric(key, h.metricValue));

    if (historicalValues.length < MIN_HISTORY_POINTS) continue;

    const rollingAvg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    if (rollingAvg === 0) continue;

    const currentValue = toNumeric(key, metric.metricValue);
    const deviationPct = Math.abs((currentValue - rollingAvg) / rollingAvg) * 100;

    if (deviationPct > threshold.value) {
      results.push({
        anomalyType: "SPIKE",
        metricKey: key,
        entryId: entry.id,
        userId: entry.userId,
        departmentId: entry.departmentId,
        description: `${key} deviated ${deviationPct.toFixed(1)}% from ${DETECTION_WINDOW} rolling average (avg: ${rollingAvg.toFixed(2)}, current: ${currentValue})`,
        detectedAt: new Date(),
        detectionWindow: DETECTION_WINDOW,
      });
    }
  }

  return results;
}

function toNumeric(key: string, value: unknown): number {
  if (key === "engagement_score") return normalizeEngagementScore(value);
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  if (isNaN(n)) throw new Error(`Cannot convert metric value to number for key "${key}": ${String(value)}`);
  return n;
}
