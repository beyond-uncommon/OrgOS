import { describe, it, expect } from "vitest";
import { aggregateAnomalies } from "../aggregators/anomalyAggregator.js";
import type { AnomalyResult } from "@orgos/shared-types";

function makeAnomaly(overrides: Partial<AnomalyResult>): AnomalyResult {
  return {
    anomalyType: "SPIKE",
    departmentId: "dept-1",
    description: "test",
    detectedAt: new Date(),
    ...overrides,
  };
}

describe("aggregateAnomalies", () => {
  it("groups by anomaly type correctly", () => {
    const anomalies = [
      makeAnomaly({ anomalyType: "SPIKE" }),
      makeAnomaly({ anomalyType: "SPIKE" }),
      makeAnomaly({ anomalyType: "GAP" }),
      makeAnomaly({ anomalyType: "MISSING_ENTRY" }),
    ];

    const result = aggregateAnomalies(anomalies);
    expect(result.byType.SPIKE).toHaveLength(2);
    expect(result.byType.GAP).toHaveLength(1);
    expect(result.byType.MISSING_ENTRY).toHaveLength(1);
    expect(result.byType.INCONSISTENCY).toHaveLength(0);
    expect(result.totalCount).toBe(4);
  });

  it("groups by metricKey and counts frequency", () => {
    const anomalies = [
      makeAnomaly({ metricKey: "attendance_rate" }),
      makeAnomaly({ metricKey: "attendance_rate" }),
      makeAnomaly({ metricKey: "dropout_count" }),
    ];

    const result = aggregateAnomalies(anomalies);
    expect(result.byMetricKey["attendance_rate"]).toHaveLength(2);
    expect(result.metricFrequency["attendance_rate"]).toBe(2);
    expect(result.metricFrequency["dropout_count"]).toBe(1);
  });

  it("handles empty input", () => {
    const result = aggregateAnomalies([]);
    expect(result.totalCount).toBe(0);
    expect(result.byType.SPIKE).toHaveLength(0);
  });
});
