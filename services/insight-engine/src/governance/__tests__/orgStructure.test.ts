import { describe, it, expect } from "vitest";
import { hasAuthority, buildEscalationPath } from "../orgStructure.js";
import type { OrgNode } from "@orgos/shared-types";

describe("hasAuthority", () => {
  it("BOARD has authority over INSTRUCTOR", () => {
    expect(hasAuthority("BOARD", "INSTRUCTOR")).toBe(true);
  });

  it("INSTRUCTOR does not have authority over BOARD", () => {
    expect(hasAuthority("INSTRUCTOR", "BOARD")).toBe(false);
  });

  it("DEPARTMENT_HEAD has authority over PROGRAM_LEAD", () => {
    expect(hasAuthority("DEPARTMENT_HEAD", "PROGRAM_LEAD")).toBe(true);
  });

  it("same level returns true", () => {
    expect(hasAuthority("EXECUTIVE", "EXECUTIVE")).toBe(true);
  });
});

describe("buildEscalationPath", () => {
  it("DEPARTMENT_HEAD escalates to EXECUTIVE and BOARD", () => {
    const path = buildEscalationPath("DEPARTMENT_HEAD");
    expect(path).toEqual(["BOARD", "EXECUTIVE"]);
  });

  it("BOARD has empty escalation path", () => {
    const path = buildEscalationPath("BOARD");
    expect(path).toHaveLength(0);
  });

  it("INSTRUCTOR escalates through full hierarchy", () => {
    const path = buildEscalationPath("INSTRUCTOR");
    expect(path).toContain("BOARD");
    expect(path).toContain("EXECUTIVE");
    expect(path).toContain("DEPARTMENT_HEAD");
    expect(path).toContain("PROGRAM_LEAD");
  });
});
