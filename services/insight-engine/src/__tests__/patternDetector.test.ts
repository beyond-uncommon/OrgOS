import { describe, it, expect } from "vitest";
import { detectPatterns } from "../analyzers/patternDetector.js";
import { aggregateAnomalies } from "../aggregators/anomalyAggregator.js";
import type { AnomalyResult } from "@orgos/shared-types";
import type { MetricTrendSummary } from "../aggregators/metricTrendAggregator.js";

function makeAnomaly(overrides: Partial<AnomalyResult>): AnomalyResult {
  return {
    anomalyType: "SPIKE",
    departmentId: "dept-1",
    description: "test",
    detectedAt: new Date(),
    ...overrides,
  };
}

const noTrends: MetricTrendSummary[] = [];

describe("detectPatterns", () => {
  it("returns TREND pattern when same metric spikes 2+ times", () => {
    const anomalies = [
      makeAnomaly({ metricKey: "dropout_count" }),
      makeAnomaly({ metricKey: "dropout_count" }),
    ];
    const groups = aggregateAnomalies(anomalies);
    const patterns = detectPatterns(groups, noTrends);

    expect(patterns.some((p) => p.type === "TREND")).toBe(true);
    expect(patterns[0].evidence).toHaveLength(2);
  });

  it("does not create pattern with only 1 spike", () => {
    const anomalies = [makeAnomaly({ metricKey: "dropout_count" })];
    const groups = aggregateAnomalies(anomalies);
    const patterns = detectPatterns(groups, noTrends);

    expect(patterns.filter((p) => p.type === "TREND" && p.evidence.length > 0)).toHaveLength(0);
  });

  it("returns BEHAVIOR_SHIFT when 3+ missing entries", () => {
    const anomalies = Array.from({ length: 3 }, (_, i) =>
      makeAnomaly({ anomalyType: "MISSING_ENTRY", userId: `user-${i}` })
    );
    const groups = aggregateAnomalies(anomalies);
    const patterns = detectPatterns(groups, noTrends);

    expect(patterns.some((p) => p.type === "BEHAVIOR_SHIFT")).toBe(true);
  });

  it("returns RISK_CLUSTER when 2+ inconsistencies", () => {
    const anomalies = [
      makeAnomaly({ anomalyType: "INCONSISTENCY" }),
      makeAnomaly({ anomalyType: "INCONSISTENCY" }),
    ];
    const groups = aggregateAnomalies(anomalies);
    const patterns = detectPatterns(groups, noTrends);

    expect(patterns.some((p) => p.type === "RISK_CLUSTER")).toBe(true);
  });

  it("returns TREND pattern for sustained decline via trends", () => {
    const trends: MetricTrendSummary[] = [
      { metricKey: "attendance_rate", average: 70, min: 50, max: 90, trend: -0.01, volatility: 0.1, weekOverWeekDelta: -0.25, dataPoints: 5 },
    ];
    const groups = aggregateAnomalies([]);
    const patterns = detectPatterns(groups, trends);

    expect(patterns.some((p) => p.type === "TREND" && p.description.includes("attendance_rate"))).toBe(true);
  });
});
