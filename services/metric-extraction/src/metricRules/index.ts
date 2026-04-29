import { attendanceRateRule } from "./attendance.js";
import { dropoutCountRule } from "./dropout.js";
import { engagementScoreRule } from "./engagement.js";
import { outputCountRule, blockerPresentRule, riskFlagRule } from "./outputs.js";
import type { MetricRuleRegistry } from "./types.js";

export const metricRuleRegistry: MetricRuleRegistry = {
  attendance_rate:  attendanceRateRule,
  dropout_count:    dropoutCountRule,
  engagement_score: engagementScoreRule,
  output_count:     outputCountRule,
  blocker_present:  blockerPresentRule,
  risk_flag:        riskFlagRule,
};

export type { MetricRule, MetricRuleRegistry } from "./types.js";
