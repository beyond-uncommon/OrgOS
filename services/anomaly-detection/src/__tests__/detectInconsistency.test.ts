import { describe, it, expect } from "vitest";
import { detectInconsistency } from "../detectors/detectInconsistency.js";
import type { DailyEntry, ExtractedMetric } from "@orgos/shared-types";

const baseEntry = {
  id: "entry-1",
  userId: "user-1",
  departmentId: "dept-1",
  date: new Date("2026-04-27"),
} as DailyEntry;

function makeMetric(key: string, value: unknown): ExtractedMetric {
  return {
    id: `m-${key}`,
    entryId: "entry-1",
    metricKey: key,
    metricValue: value,
    confidence: 0.9,
    flagged: false,
    source: "STRUCTURED",
    promptVersion: null,
    extractedAt: new Date(),
  } as ExtractedMetric;
}

describe("detectInconsistency", () => {
  it("flags attendance=100 with dropout>0", () => {
    const metrics = [
      makeMetric("attendance_rate", 100),
      makeMetric("dropout_count", 2),
    ];
    const results = detectInconsistency({ entry: baseEntry, currentMetrics: metrics });
    expect(results.some((r) => r.description.includes("attendance_rate"))).toBe(true);
  });

  it("flags attendance=0 with output>0", () => {
    const metrics = [
      makeMetric("attendance_rate", 0),
      makeMetric("output_count", 5),
    ];
    const results = detectInconsistency({ entry: baseEntry, currentMetrics: metrics });
    expect(results.some((r) => r.description.includes("attendance_rate"))).toBe(true);
  });

  it("flags HIGH engagement with risk_flag=true", () => {
    const metrics = [
      makeMetric("engagement_score", "HIGH"),
      makeMetric("risk_flag", true),
    ];
    const results = detectInconsistency({ entry: baseEntry, currentMetrics: metrics });
    expect(results.some((r) => r.description.includes("engagement_score"))).toBe(true);
  });

  it("returns no results for consistent metrics", () => {
    const metrics = [
      makeMetric("attendance_rate", 85),
      makeMetric("dropout_count", 0),
      makeMetric("engagement_score", "HIGH"),
      makeMetric("risk_flag", false),
    ];
    const results = detectInconsistency({ entry: baseEntry, currentMetrics: metrics });
    expect(results).toHaveLength(0);
  });

  it("ignores flagged metrics", () => {
    const metrics = [
      { ...makeMetric("attendance_rate", 100), flagged: true },
      makeMetric("dropout_count", 5),
    ];
    const results = detectInconsistency({ entry: baseEntry, currentMetrics: metrics });
    expect(results).toHaveLength(0);
  });
});
