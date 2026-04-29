import type { DailyEntry, ExtractedMetric } from "@orgos/shared-types";
import type { AnomalyResult } from "@orgos/shared-types";
import { isGapEligible } from "../config/metricCapabilities.js";

const DETECTION_WINDOW = "14d";
const MIN_CONFIDENCE = 0.7;
/** A metric is "absent" for this entry if it never appeared previously but now does — opposite: was present, now missing */
const GAP_LOOKBACK_DAYS = 7;

interface DetectGapInput {
  entry: DailyEntry;
  currentMetrics: ExtractedMetric[];
  history: ExtractedMetric[];
}

export function detectGap({ entry, currentMetrics, history }: DetectGapInput): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  const eligibleKeys = history
    .filter((h) => isGapEligible(h.metricKey as never) && !h.flagged && h.confidence >= MIN_CONFIDENCE)
    .map((h) => h.metricKey);

  const historicalKeys = new Set(eligibleKeys);
  const currentKeys = new Set(
    currentMetrics
      .filter((m) => !m.flagged && m.confidence >= MIN_CONFIDENCE)
      .map((m) => m.metricKey)
  );

  for (const key of historicalKeys) {
    if (!isGapEligible(key as never)) continue;

    const recentHistory = history.filter(
      (h) =>
        h.metricKey === key &&
        !h.flagged &&
        h.confidence >= MIN_CONFIDENCE &&
        daysBefore(h.createdAt, entry.date) <= GAP_LOOKBACK_DAYS
    );

    if (recentHistory.length === 0) continue;

    if (!currentKeys.has(key)) {
      results.push({
        anomalyType: "GAP",
        metricKey: key as never,
        entryId: entry.id,
        userId: entry.userId,
        departmentId: entry.departmentId,
        description: `${key} was present in the last ${GAP_LOOKBACK_DAYS} days but is missing from today's entry`,
        detectedAt: new Date(),
        detectionWindow: DETECTION_WINDOW,
      });
    }
  }

  return results;
}

function daysBefore(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
