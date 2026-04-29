import { describe, it, expect } from "vitest";
import { applyGovernancePolicy } from "../governancePolicyEngine.js";
import type { ActionPlan, BoardPolicy } from "@orgos/shared-types";

function makePolicy(overrides: Partial<BoardPolicy> = {}): BoardPolicy {
  return {
    id:                   "policy-1",
    departmentId:         "dept-1",
    automationLevel:      "LIMITED",
    maxAutoRiskThreshold: 0.6,
    allowedAutoActions:   ["baseline_documentation", "engagement_opportunity_flag"],
    forbiddenActions:     [],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ActionPlan> = {}): ActionPlan {
  return {
    actionType:    "baseline_documentation",
    target:        "dept-1",
    priority:      2,
    urgency:       "7D",
    executionMode: "AUTO",
    rationale:     "test",
    payload:       {},
    forecastRunId: "run-1",
    departmentId:  "dept-1",
    expiresAt:     new Date(Date.now() + 86400000),
    ...overrides,
  };
}

describe("applyGovernancePolicy", () => {
  it("blocks everything except SYSTEM when automationLevel is LOCKED", () => {
    const result = applyGovernancePolicy(makePlan({ executionMode: "AUTO" }), makePolicy({ automationLevel: "LOCKED" }), 0.3);
    expect(result.allowed).toBe(false);
    expect(result.requiredApprovalLevel).toBe("BOARD");
  });

  it("allows SYSTEM actions even when LOCKED", () => {
    const result = applyGovernancePolicy(makePlan({ executionMode: "SYSTEM" }), makePolicy({ automationLevel: "LOCKED" }), 0.3);
    expect(result.allowed).toBe(true);
  });

  it("blocks forbidden action types", () => {
    const result = applyGovernancePolicy(
      makePlan({ actionType: "forbidden_op" }),
      makePolicy({ forbiddenActions: ["forbidden_op"] }),
      0.1,
    );
    expect(result.allowed).toBe(false);
  });

  it("blocks AUTO action not in allowedAutoActions under LIMITED automation", () => {
    const result = applyGovernancePolicy(
      makePlan({ actionType: "student_engagement_intervention", executionMode: "AUTO" }),
      makePolicy({ automationLevel: "LIMITED" }),
      0.3,
    );
    expect(result.allowed).toBe(false);
    expect(result.requiredApprovalLevel).toBe("DEPARTMENT_HEAD");
  });

  it("blocks AUTO action when likelihood exceeds maxAutoRiskThreshold", () => {
    const result = applyGovernancePolicy(makePlan({ executionMode: "AUTO" }), makePolicy(), 0.8);
    expect(result.allowed).toBe(false);
  });

  it("allows AUTO action within allowed list and under threshold", () => {
    const result = applyGovernancePolicy(makePlan({ executionMode: "AUTO" }), makePolicy(), 0.4);
    expect(result.allowed).toBe(true);
    expect(result.requiredApprovalLevel).toBeNull();
  });

  it("allows FULL automation for any action type under threshold", () => {
    const result = applyGovernancePolicy(
      makePlan({ actionType: "student_engagement_intervention", executionMode: "AUTO" }),
      makePolicy({ automationLevel: "FULL" }),
      0.5,
    );
    expect(result.allowed).toBe(true);
  });

  it("requires EXECUTIVE approval for P0 HUMAN_APPROVAL", () => {
    const result = applyGovernancePolicy(
      makePlan({ priority: 0, executionMode: "HUMAN_APPROVAL" }),
      makePolicy(),
      0.8,
    );
    expect(result.allowed).toBe(true);
    expect(result.requiredApprovalLevel).toBe("EXECUTIVE");
  });

  it("requires DEPARTMENT_HEAD approval for P1 HUMAN_APPROVAL", () => {
    const result = applyGovernancePolicy(
      makePlan({ priority: 1, executionMode: "HUMAN_APPROVAL" }),
      makePolicy(),
      0.6,
    );
    expect(result.allowed).toBe(true);
    expect(result.requiredApprovalLevel).toBe("DEPARTMENT_HEAD");
  });

  it("requires PROGRAM_LEAD for P2 HUMAN_APPROVAL", () => {
    const result = applyGovernancePolicy(
      makePlan({ priority: 2, executionMode: "HUMAN_APPROVAL" }),
      makePolicy(),
      0.5,
    );
    expect(result.allowed).toBe(true);
    expect(result.requiredApprovalLevel).toBe("PROGRAM_LEAD");
  });

  it("escalation path excludes the required level itself", () => {
    const result = applyGovernancePolicy(
      makePlan({ priority: 1, executionMode: "HUMAN_APPROVAL" }),
      makePolicy(),
      0.5,
    );
    expect(result.escalationPath).not.toContain("DEPARTMENT_HEAD");
    expect(result.escalationPath).toContain("EXECUTIVE");
  });
});
