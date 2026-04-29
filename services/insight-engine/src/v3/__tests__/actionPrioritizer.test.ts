import { describe, it, expect } from "vitest";
import { prioritizeActions } from "../planner/actionPrioritizer.js";
import type { ActionPlan } from "@orgos/shared-types";

function makePlan(overrides: Partial<ActionPlan>): ActionPlan {
  return {
    actionType:    "test_action",
    target:        "dept-1",
    priority:      2,
    urgency:       "7D",
    executionMode: "SYSTEM",
    rationale:     "test",
    payload:       {},
    forecastRunId: "run-1",
    departmentId:  "dept-1",
    expiresAt:     new Date(Date.now() + 86400000),
    ...overrides,
  };
}

describe("prioritizeActions", () => {
  it("sorts lower priority numbers first (P0 before P2)", () => {
    const plans = [
      makePlan({ priority: 2 }),
      makePlan({ priority: 0 }),
      makePlan({ priority: 1 }),
    ];
    const sorted = prioritizeActions(plans);
    expect(sorted.map((p) => p.priority)).toEqual([0, 1, 2]);
  });

  it("sorts IMMEDIATE before 7D at same priority", () => {
    const plans = [
      makePlan({ priority: 1, urgency: "7D" }),
      makePlan({ priority: 1, urgency: "IMMEDIATE" }),
    ];
    const sorted = prioritizeActions(plans);
    expect(sorted[0].urgency).toBe("IMMEDIATE");
  });

  it("sorts HUMAN_APPROVAL before AUTO at same priority and urgency", () => {
    const plans = [
      makePlan({ priority: 1, urgency: "24H", executionMode: "AUTO" }),
      makePlan({ priority: 1, urgency: "24H", executionMode: "HUMAN_APPROVAL" }),
    ];
    const sorted = prioritizeActions(plans);
    expect(sorted[0].executionMode).toBe("HUMAN_APPROVAL");
  });

  it("does not mutate the input array", () => {
    const plans = [makePlan({ priority: 2 }), makePlan({ priority: 0 })];
    const original = [...plans];
    prioritizeActions(plans);
    expect(plans).toEqual(original);
  });
});
