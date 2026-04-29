import type { DailyEntry, ExtractedMetric } from "@orgos/shared-types";
import type { AnomalyResult } from "@orgos/shared-types";

interface DetectInconsistencyInput {
  entry: DailyEntry;
  currentMetrics: ExtractedMetric[];
}

type MetricMap = Partial<Record<string, unknown>>;

/**
 * Cross-field logical contradiction rules.
 * Each rule returns a description string if the contradiction is found, null otherwise.
 */
const RULES: Array<(metrics: MetricMap) => string | null> = [
  // Full attendance but dropout present
  (m) => {
    const attendance = m["attendance_rate"];
    const dropout = m["dropout_count"];
    if (typeof attendance === "number" && typeof dropout === "number") {
      if (attendance >= 100 && dropout > 0) {
        return `attendance_rate is ${attendance}% but dropout_count is ${dropout} — logically contradictory`;
      }
    }
    return null;
  },

  // High engagement but risk_flag set
  (m) => {
    const engagement = m["engagement_score"];
    const risk = m["risk_flag"];
    if (engagement === "HIGH" && risk === true) {
      return `engagement_score is HIGH but risk_flag is set — warrants review`;
    }
    return null;
  },

  // Zero attendance but output present
  (m) => {
    const attendance = m["attendance_rate"];
    const output = m["output_count"];
    if (typeof attendance === "number" && typeof output === "number") {
      if (attendance === 0 && output > 0) {
        return `attendance_rate is 0% but output_count is ${output} — logically contradictory`;
      }
    }
    return null;
  },

  // Blocker present but high output
  (m) => {
    const blocker = m["blocker_present"];
    const output = m["output_count"];
    if (blocker === true && typeof output === "number" && output > 10) {
      return `blocker_present is true but output_count is ${output} — unusually high output despite blocker`;
    }
    return null;
  },
];

export function detectInconsistency({ entry, currentMetrics }: DetectInconsistencyInput): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  const metricMap: MetricMap = {};
  for (const m of currentMetrics) {
    if (!m.flagged) {
      metricMap[m.metricKey] = m.metricValue;
    }
  }

  for (const rule of RULES) {
    const description = rule(metricMap);
    if (description) {
      results.push({
        anomalyType: "INCONSISTENCY",
        entryId: entry.id,
        userId: entry.userId,
        departmentId: entry.departmentId,
        description,
        detectedAt: new Date(),
      });
    }
  }

  return results;
}
