import type { MetricRule } from "./types.js";

// directional: more outputs completed is better
export const outputCountRule: MetricRule = {
  key: "output_count",
  type: "directional",
  evaluate: (direction) => ({
    direction,
    impact: direction === "up" ? "positive" : direction === "down" ? "negative" : "positive",
  }),
};

// stateful: blocker_present is boolean — direction is meaningless,
// only the current value (true/false) determines impact
export const blockerPresentRule: MetricRule = {
  key: "blocker_present",
  type: "stateful",
  evaluate: (_direction, value) => ({
    direction: value === true ? "up" : "down",
    impact: value === true ? "negative" : "positive",
  }),
};

// stateful: risk_flag is boolean — same pattern as blocker_present
export const riskFlagRule: MetricRule = {
  key: "risk_flag",
  type: "stateful",
  evaluate: (_direction, value) => ({
    direction: value === true ? "up" : "down",
    impact: value === true ? "negative" : "positive",
  }),
};
