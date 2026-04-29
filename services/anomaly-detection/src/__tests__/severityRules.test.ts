import { describe, it, expect } from "vitest";
import { resolveSeverity } from "../config/severityRules.js";
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

describe("resolveSeverity", () => {
  it("MISSING_ENTRY day 1 → MEDIUM", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "MISSING_ENTRY", consecutiveDays: 1 }))).toBe("MEDIUM");
  });

  it("MISSING_ENTRY day 2 → HIGH", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "MISSING_ENTRY", consecutiveDays: 2 }))).toBe("HIGH");
  });

  it("MISSING_ENTRY day 3+ → CRITICAL", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "MISSING_ENTRY", consecutiveDays: 3 }))).toBe("CRITICAL");
    expect(resolveSeverity(makeAnomaly({ anomalyType: "MISSING_ENTRY", consecutiveDays: 5 }))).toBe("CRITICAL");
  });

  it("SPIKE on dropout_count → HIGH", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "SPIKE", metricKey: "dropout_count" }))).toBe("HIGH");
  });

  it("SPIKE on attendance_rate → MEDIUM", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "SPIKE", metricKey: "attendance_rate" }))).toBe("MEDIUM");
  });

  it("GAP → LOW", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "GAP" }))).toBe("LOW");
  });

  it("INCONSISTENCY → MEDIUM", () => {
    expect(resolveSeverity(makeAnomaly({ anomalyType: "INCONSISTENCY" }))).toBe("MEDIUM");
  });
});
