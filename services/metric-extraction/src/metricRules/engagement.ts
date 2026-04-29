import type { MetricRule } from "./types.js";

// directional: engagement moving up is unambiguously better
export const engagementScoreRule: MetricRule = {
  key: "engagement_score",
  type: "directional",
  evaluate: (direction) => ({
    direction,
    impact: direction === "up" ? "positive" : direction === "down" ? "negative" : "positive",
  }),
};
