import { describe, it, expect } from "vitest";
import { detectGap } from "../detectors/detectGap.js";
import type { DailyEntry, ExtractedMetric } from "@orgos/shared-types";

const entryDate = new Date("2026-04-27");
const baseEntry = {
  id: "entry-1",
  userId: "user-1",
  departmentId: "dept-1",
  date: entryDate,
} as DailyEntry;

function makeMetric(overrides: Partial<ExtractedMetric>): ExtractedMetric {
  return {
    id: "m-1",
    entryId: "entry-0",
    metricKey: "attendance_rate",
    metricValue: 80,
    confidence: 0.9,
    flagged: false,
    source: "STRUCTURED",
    promptVersion: null,
    extractedAt: new Date("2026-04-25"),
    ...overrides,
  } as ExtractedMetric;
}

describe("detectGap", () => {
  it("returns GAP when a metric present in recent history is absent from current entry", () => {
    const history = [
      makeMetric({ extractedAt: new Date("2026-04-24") }),
      makeMetric({ extractedAt: new Date("2026-04-25") }),
    ];

    const results = detectGap({ entry: baseEntry, currentMetrics: [], history });
    expect(results).toHaveLength(1);
    expect(results[0].anomalyType).toBe("GAP");
    expect(results[0].metricKey).toBe("attendance_rate");
  });

  it("returns no results when metric is present in current entry", () => {
    const history = [makeMetric({ extractedAt: new Date("2026-04-25") })];
    const current = [makeMetric({ entryId: "entry-1", extractedAt: entryDate })];

    const results = detectGap({ entry: baseEntry, currentMetrics: current, history });
    expect(results).toHaveLength(0);
  });

  it("returns no results when historical metric is outside the lookback window", () => {
    const history = [makeMetric({ extractedAt: new Date("2026-04-01") })]; // >7 days ago
    const results = detectGap({ entry: baseEntry, currentMetrics: [], history });
    expect(results).toHaveLength(0);
  });

  it("skips non-gap-eligible metrics (blocker_present)", () => {
    const history = [makeMetric({ metricKey: "blocker_present", metricValue: true })];
    const results = detectGap({ entry: baseEntry, currentMetrics: [], history });
    expect(results).toHaveLength(0);
  });
});
