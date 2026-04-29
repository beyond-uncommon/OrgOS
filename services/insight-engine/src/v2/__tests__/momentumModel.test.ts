import { describe, it, expect } from "vitest";
import { forecast, volatilityDamping, initSmoothedState } from "../models/momentumModel.js";

describe("forecast", () => {
  it("projects a stable series as stable", () => {
    const values = [10, 10, 10, 10, 10];
    const { projected } = forecast(values, 1);
    expect(projected).toBeCloseTo(10, 1);
  });

  it("projects an upward-trending series above current value", () => {
    const values = [10, 12, 14, 16, 18];
    const { projected } = forecast(values, 1);
    expect(projected).toBeGreaterThan(18);
  });

  it("projects a declining series below current value", () => {
    const values = [18, 16, 14, 12, 10];
    const { projected } = forecast(values, 1);
    expect(projected).toBeLessThan(10);
  });

  it("returns level=0 trend=0 for empty series", () => {
    const { projected, state } = forecast([], 1);
    expect(projected).toBe(0);
    expect(state.level).toBe(0);
    expect(state.trend).toBe(0);
  });

  it("produces further projection for larger stepsAhead", () => {
    const values = [10, 12, 14, 16, 18];
    const f1 = forecast(values, 1);
    const f4 = forecast(values, 4);
    expect(f4.projected).toBeGreaterThan(f1.projected);
  });
});

describe("volatilityDamping", () => {
  it("returns 1 for a perfectly stable series", () => {
    expect(volatilityDamping([10, 10, 10, 10])).toBeCloseTo(1, 1);
  });

  it("returns < 1 for a high-variance series", () => {
    expect(volatilityDamping([1, 100, 1, 100, 1])).toBeLessThan(0.5);
  });

  it("returns 0.5 for a zero-mean series", () => {
    expect(volatilityDamping([0, 0, 0])).toBe(0.5);
  });
});
