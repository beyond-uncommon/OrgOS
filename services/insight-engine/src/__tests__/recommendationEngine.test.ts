import { describe, it, expect } from "vitest";
import { generateRecommendations } from "../recommendations/recommendationEngine.js";
import type { InsightPattern, InsightCorrelation, RiskSignal, AnomalyResult } from "@orgos/shared-types";

const noPatterns: InsightPattern[] = [];
const noCorrelations: InsightCorrelation[] = [];
const noRisks: RiskSignal[] = [];

function makeRisk(overrides: Partial<RiskSignal>): RiskSignal {
  return {
    category: "OPERATIONAL",
    severity: "MEDIUM",
    description: "test",
    evidence: [],
    ...overrides,
  };
}

function makePattern(overrides: Partial<InsightPattern>): InsightPattern {
  return {
    type: "TREND",
    severity: "MEDIUM",
    description: "test",
    evidence: [],
    ...overrides,
  };
}

describe("generateRecommendations", () => {
  it("returns systemic recommendation for CRITICAL risk", () => {
    const risks = [makeRisk({ severity: "CRITICAL" })];
    const recs = generateRecommendations(noPatterns, noCorrelations, risks);
    expect(recs.some((r) => r.includes("immediate"))).toBe(true);
  });

  it("returns follow-up recommendation for repeat missing entry users", () => {
    const missedEvidence: AnomalyResult[] = [
      { anomalyType: "MISSING_ENTRY", userId: "u1", departmentId: "d1", description: "", detectedAt: new Date() },
      { anomalyType: "MISSING_ENTRY", userId: "u1", departmentId: "d1", description: "", detectedAt: new Date() },
    ];
    const patterns = [makePattern({ type: "BEHAVIOR_SHIFT", evidence: missedEvidence })];
    const recs = generateRecommendations(patterns, noCorrelations, noRisks);
    expect(recs.some((r) => r.includes("Follow up directly"))).toBe(true);
  });

  it("returns audit recommendation for DATA_QUALITY risk", () => {
    const risks = [makeRisk({ category: "DATA_QUALITY" })];
    const recs = generateRecommendations(noPatterns, noCorrelations, risks);
    expect(recs.some((r) => r.includes("accuracy"))).toBe(true);
  });

  it("deduplicates when multiple rules produce the same recommendation", () => {
    const risks = [makeRisk({ severity: "CRITICAL" }), makeRisk({ severity: "CRITICAL", category: "ENGAGEMENT" })];
    const recs = generateRecommendations(noPatterns, noCorrelations, risks);
    const systemic = recs.filter((r) => r.includes("immediate"));
    expect(systemic).toHaveLength(1);
  });

  it("returns empty array when no signals present", () => {
    const recs = generateRecommendations(noPatterns, noCorrelations, noRisks);
    expect(recs).toHaveLength(0);
  });
});
