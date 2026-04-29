import type { MetricKey, ResolvedTrend } from "@orgos/shared-types";

export type MetricRuleType = "directional" | "inverse" | "stateful";

export interface MetricRule {
  key: MetricKey;
  type: MetricRuleType;
  /**
   * value is required for stateful metrics where direction alone is ambiguous.
   * directional and inverse metrics ignore it.
   */
  evaluate: (direction: "up" | "down" | "neutral", value?: unknown) => ResolvedTrend;
}

export type MetricRuleRegistry = Record<MetricKey, MetricRule>;
