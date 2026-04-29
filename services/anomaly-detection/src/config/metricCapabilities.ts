import type { MetricKey } from "@orgos/shared-types";
import { SPIKE_THRESHOLDS } from "./thresholds.js";

/**
 * Declares which detection methods apply to each metric.
 * Detectors check these flags instead of implicitly guessing from threshold values.
 */
export interface MetricCapabilities {
  spikeEligible: boolean;
  gapEligible: boolean;
}

export const METRIC_CAPABILITIES: Record<MetricKey, MetricCapabilities> = {
  attendance_rate:   { spikeEligible: true,  gapEligible: true  },
  dropout_count:     { spikeEligible: true,  gapEligible: true  },
  engagement_score:  { spikeEligible: true,  gapEligible: true  },
  output_count:      { spikeEligible: true,  gapEligible: true  },
  blocker_present:   { spikeEligible: false, gapEligible: false },
  risk_flag:         { spikeEligible: false, gapEligible: false },
};

export function isSpikeEligible(key: MetricKey): boolean {
  return METRIC_CAPABILITIES[key].spikeEligible &&
         SPIKE_THRESHOLDS[key].type === "numeric";
}

export function isGapEligible(key: MetricKey): boolean {
  return METRIC_CAPABILITIES[key].gapEligible;
}
