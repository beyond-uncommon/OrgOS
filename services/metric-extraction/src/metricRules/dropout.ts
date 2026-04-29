import type { MetricRule } from "./types.js";

// inverse: the metric moving down is the good outcome
export const dropoutCountRule: MetricRule = {
  key: "dropout_count",
  type: "inverse",
  evaluate: (direction) => ({
    direction,
    impact: direction === "up" ? "negative" : direction === "down" ? "positive" : "positive",
  }),
};
