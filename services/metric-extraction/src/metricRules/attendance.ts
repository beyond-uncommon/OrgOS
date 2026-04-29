import type { MetricRule } from "./types.js";

// directional: higher attendance is unambiguously better
export const attendanceRateRule: MetricRule = {
  key: "attendance_rate",
  type: "directional",
  evaluate: (direction) => ({
    direction,
    impact: direction === "up" ? "positive" : direction === "down" ? "negative" : "positive",
  }),
};
