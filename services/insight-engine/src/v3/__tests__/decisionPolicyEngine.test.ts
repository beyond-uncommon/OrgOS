import { describe, it, expect } from "vitest";
import { applyDecisionPolicy } from "../policy/decisionPolicyEngine.js";
import type { InsightForecast, ForwardRiskSignal, OpportunitySignal } from "@orgos/shared-types";

function makeRisk(overrides: Partial<ForwardRiskSignal>): ForwardRiskSignal {
  return {
    category: "OPERATIONAL",
    likelihood: 0.5,
    impact: "MEDIUM",
    timeToManifest: "14D",
    confidence: 0.7,
    description: "test risk",
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<OpportunitySignal>): OpportunitySignal {
  return {
    type: "ENGAGEMENT_IMPROVEMENT",
    description: "test",
    expectedBenefit: "good things",
    confidence: 0.7,
    ...overrides,
  };
}

function makeForecast(overrides: Partial<InsightForecast>): InsightForecast {
  return {
    departmentId: "dept-1",
    summary: "",
    forecastedTrends: [],
    recurrenceRisks: [],
    escalationForecasts: [],
    forwardRisks: [],
    opportunities: [],
    recommendedPreemptiveActions: [],
    confidence: 0.7,
    generatedAt: new Date(),
    ...overrides,
  };
}

describe("applyDecisionPolicy", () => {
  it("returns ESCALATE for high-likelihood, high-impact risks", () => {
    const forecast = makeForecast({
      forwardRisks: [makeRisk({ likelihood: 0.8, impact: "HIGH" })],
    });
    const decisions = applyDecisionPolicy(forecast);
    expect(decisions.some((d) => d.type === "ESCALATE")).toBe(true);
  });

  it("returns INTERVENE for medium-likelihood risks", () => {
    const forecast = makeForecast({
      forwardRisks: [makeRisk({ likelihood: 0.55, impact: "MEDIUM" })],
    });
    const decisions = applyDecisionPolicy(forecast);
    expect(decisions.some((d) => d.type === "INTERVENE")).toBe(true);
  });

  it("returns MONITOR for low-likelihood risks above confidence floor", () => {
    const forecast = makeForecast({
      forwardRisks: [makeRisk({ likelihood: 0.25, confidence: 0.5 })],
    });
    const decisions = applyDecisionPolicy(forecast);
    expect(decisions.some((d) => d.type === "MONITOR")).toBe(true);
  });

  it("drops signals below confidence threshold (IGNORE)", () => {
    const forecast = makeForecast({
      forwardRisks: [makeRisk({ confidence: 0.3 })],
    });
    const decisions = applyDecisionPolicy(forecast);
    expect(decisions).toHaveLength(0);
  });

  it("drops opportunities below confidence threshold", () => {
    const forecast = makeForecast({
      opportunities: [makeOpportunity({ confidence: 0.4 })],
    });
    const decisions = applyDecisionPolicy(forecast);
    expect(decisions).toHaveLength(0);
  });

  it("returns MONITOR for qualifying opportunities", () => {
    const forecast = makeForecast({
      opportunities: [makeOpportunity({ confidence: 0.75 })],
    });
    const decisions = applyDecisionPolicy(forecast);
    expect(decisions.some((d) => d.type === "MONITOR")).toBe(true);
  });
});
