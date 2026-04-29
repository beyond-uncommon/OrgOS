import type { MetricKey } from "@orgos/shared-types";

export type ThresholdType = "numeric" | "categorical" | "boolean";

export interface ThresholdConfig {
  type: ThresholdType;
  /** Percentage deviation that triggers a spike. Ignored for non-numeric. */
  value: number;
}

/**
 * Spike thresholds per metric key.
 * Data only — no logic. Detectors read this; this file calls nothing.
 */
export const SPIKE_THRESHOLDS: Record<MetricKey, ThresholdConfig> = {
  attendance_rate:   { type: "numeric",     value: 15 },
  dropout_count:     { type: "numeric",     value: 50 },
  engagement_score:  { type: "numeric",     value: 20 }, // normalised LOW=0 MED=1 HIGH=2
  output_count:      { type: "numeric",     value: 40 },
  blocker_present:   { type: "boolean",     value: 0  },
  risk_flag:         { type: "boolean",     value: 0  },
};
