import { describe, it, expect } from "vitest";
import { planAction } from "../planner/actionPlanner.js";
import type { DecisionSignal, ForwardRiskSignal } from "@orgos/shared-types";

function makeDecision(overrides: Partial<DecisionSignal>): DecisionSignal {
  const source: ForwardRiskSignal = {
    category: "OPERATIONAL",
    likelihood: 0.8,
    impact: "HIGH",
    timeToManifest: "7D",
    confidence: 0.75,
    description: "test",
  };
  return {
    type: "ESCALATE",
    confidence: 0.75,
    rationale: "test rationale",
    sourceSignal: source,
    ...overrides,
  };
}

describe("planAction", () => {
  it("returns null for MONITOR decisions", () => {
    const plan = planAction(makeDecision({ type: "MONITOR" }), "dept-1", "run-1");
    expect(plan).toBeNull();
  });

  it("forces HUMAN_APPROVAL for ESCALATE regardless of matrix default", () => {
    const plan = planAction(makeDecision({ type: "ESCALATE" }), "dept-1", "run-1");
    expect(plan?.executionMode).toBe("HUMAN_APPROVAL");
  });

  it("produces P0 priority for CRITICAL impact", () => {
    const source: ForwardRiskSignal = {
      category: "OPERATIONAL", likelihood: 0.9, impact: "CRITICAL",
      timeToManifest: "7D", confidence: 0.8, description: "critical",
    };
    const plan = planAction(makeDecision({ sourceSignal: source }), "dept-1", "run-1");
    expect(plan?.priority).toBe(0);
  });

  it("produces P3 priority for opportunity actions", () => {
    const decision: DecisionSignal = {
      type: "INTERVENE",
      confidence: 0.7,
      rationale: "opportunity",
      sourceSignal: {
        type: "SCALING_READINESS",
        description: "test",
        expectedBenefit: "growth",
        confidence: 0.7,
      },
    };
    const plan = planAction(decision, "dept-1", "run-1");
    expect(plan?.priority).toBe(3);
  });

  it("sets expiresAt based on urgency", () => {
    const plan = planAction(makeDecision({ type: "INTERVENE" }), "dept-1", "run-1");
    expect(plan?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
