import { describe, it, expect } from "vitest";
import { detectCorrelations } from "../correlation/correlationEngine.js";
import { aggregateAnomalies } from "../aggregators/anomalyAggregator.js";
import type { AnomalyResult, InsightContext } from "@orgos/shared-types";
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

const baseContext: InsightContext = {
  departmentId: "dept-1",
  timeWindow: { from: new Date("2026-04-20"), to: new Date("2026-04-27") },
  anomalies: [],
  alerts: [],
  metrics: [],
};

const noTrends: MetricTrendSummary[] = [];

describe("detectCorrelations", () => {
  it("detects attendance→dropout correlation when dropout spikes and attendance is declining", () => {
    const anomalies = [
      makeAnomaly({ metricKey: "dropout_count" }),
      makeAnomaly({ metricKey: "attendance_rate" }),
    ];
    const groups = aggregateAnomalies(anomalies);
    const trends: MetricTrendSummary[] = [
      { metricKey: "attendance_rate", average: 70, min: 50, max: 90, trend: -0.01, volatility: 0.1, weekOverWeekDelta: -0.2, dataPoints: 5 },
    ];

    const correlations = detectCorrelations(baseContext, groups, trends);
    expect(correlations.some((c) => c.effect.includes("dropout_count"))).toBe(true);
    expect(correlations[0].supportingAnomalies.length).toBeGreaterThan(0);
    expect(correlations[0].confidence).toBeGreaterThan(0.6);
  });

  it("detects systemic correlation when dropout + attendance + missing entries all present", () => {
    const anomalies = [
      makeAnomaly({ metricKey: "dropout_count" }),
      makeAnomaly({ metricKey: "attendance_rate" }),
      makeAnomaly({ anomalyType: "MISSING_ENTRY" }),
    ];
    const groups = aggregateAnomalies(anomalies);

    const correlations = detectCorrelations(baseContext, groups, noTrends);
    const systemic = correlations.find((c) => c.confidence >= 0.85);

    expect(systemic).toBeDefined();
    expect(systemic!.confidence).toBe(0.9);
  });

  it("returns empty when no conditions are met", () => {
    const groups = aggregateAnomalies([]);
    const correlations = detectCorrelations(baseContext, groups, noTrends);
    expect(correlations).toHaveLength(0);
  });
});
