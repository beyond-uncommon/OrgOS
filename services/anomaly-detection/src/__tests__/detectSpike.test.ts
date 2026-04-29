import { describe, it, expect } from "vitest";
import { detectSpike } from "../detectors/detectSpike.js";
import type { DailyEntry, ExtractedMetric } from "@orgos/shared-types";

const baseEntry = {
  id: "entry-1",
  userId: "user-1",
  departmentId: "dept-1",
  date: new Date("2026-04-27"),
} as DailyEntry;

function makeMetric(overrides: Partial<ExtractedMetric>): ExtractedMetric {
  return {
    id: "m-1",
    entryId: "entry-1",
    metricKey: "attendance_rate",
    metricValue: 80,
    confidence: 0.9,
    flagged: false,
    source: "STRUCTURED",
    promptVersion: null,
    extractedAt: new Date("2026-04-27"),
    ...overrides,
  } as ExtractedMetric;
}

describe("detectSpike", () => {
  it("returns no results when history is insufficient", () => {
    const current = [makeMetric({ metricValue: 200 })];
    const history = [makeMetric({ metricValue: 80 })]; // only 1 point, need 3

    const results = detectSpike({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(0);
  });

  it("returns no results when deviation is within threshold", () => {
    const current = [makeMetric({ metricValue: 85 })]; // 6.25% deviation from avg 80
    const history = Array.from({ length: 5 }, () => makeMetric({ metricValue: 80 }));

    const results = detectSpike({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(0);
  });

  it("returns SPIKE anomaly when deviation exceeds threshold (attendance_rate = 15%)", () => {
    const current = [makeMetric({ metricValue: 50 })]; // 37.5% deviation from avg 80
    const history = Array.from({ length: 5 }, () => makeMetric({ metricValue: 80 }));

    const results = detectSpike({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(1);
    expect(results[0].anomalyType).toBe("SPIKE");
    expect(results[0].metricKey).toBe("attendance_rate");
    expect(results[0].entryId).toBe("entry-1");
  });

  it("skips flagged metrics", () => {
    const current = [makeMetric({ metricValue: 10, flagged: true })];
    const history = Array.from({ length: 5 }, () => makeMetric({ metricValue: 80 }));

    const results = detectSpike({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(0);
  });

  it("skips low-confidence metrics", () => {
    const current = [makeMetric({ metricValue: 10, confidence: 0.5 })];
    const history = Array.from({ length: 5 }, () => makeMetric({ metricValue: 80 }));

    const results = detectSpike({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(0);
  });

  it("handles engagement_score normalization (LOW=0, MEDIUM=1, HIGH=2)", () => {
    const current = [makeMetric({ metricKey: "engagement_score", metricValue: "LOW" })];
    // avg of 5x MEDIUM = 1, LOW = 0 → 100% deviation > 20% threshold
    const history = Array.from({ length: 5 }, () =>
      makeMetric({ metricKey: "engagement_score", metricValue: "MEDIUM" })
    );

    const results = detectSpike({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(1);
    expect(results[0].metricKey).toBe("engagement_score");
  });
});
