import { describe, it, expect } from "vitest";
import { forecastTrends, buildValueSeries } from "../predictors/trendForecaster.js";
import type { MetricTrendSummary } from "../../aggregators/metricTrendAggregator.js";

function makeSummary(metricKey: string, trend: number): MetricTrendSummary {
  return { metricKey, average: 80, min: 60, max: 100, trend, volatility: 0.1, weekOverWeekDelta: 0, dataPoints: 7 };
}

describe("forecastTrends", () => {
  it("classifies rising series as UP", () => {
    const series = new Map([["attendance_rate", [60, 65, 70, 75, 80]]]);
    const summaries = [makeSummary("attendance_rate", 0.01)];
    const result = forecastTrends(summaries, series);

    expect(result).toHaveLength(1);
    expect(result[0].direction).toBe("UP");
    expect(result[0].projectedValue7Days).toBeGreaterThan(80);
  });

  it("classifies declining series as DOWN", () => {
    const series = new Map([["attendance_rate", [80, 75, 70, 65, 60]]]);
    const summaries = [makeSummary("attendance_rate", -0.01)];
    const result = forecastTrends(summaries, series);

    expect(result[0].direction).toBe("DOWN");
    expect(result[0].projectedValue7Days).toBeLessThan(60);
  });

  it("skips metrics with fewer than 3 data points", () => {
    const series = new Map([["attendance_rate", [80, 75]]]);
    const summaries = [makeSummary("attendance_rate", -0.01)];
    const result = forecastTrends(summaries, series);
    expect(result).toHaveLength(0);
  });

  it("volatilityDamping lowers confidence for unstable series", () => {
    const stable   = new Map([["attendance_rate", [80, 81, 80, 81, 80]]]);
    const unstable = new Map([["attendance_rate", [10, 90, 10, 90, 10]]]);
    const summaries = [makeSummary("attendance_rate", 0)];

    const stableResult   = forecastTrends(summaries, stable);
    const unstableResult = forecastTrends(summaries, unstable);

    expect(stableResult[0].confidence).toBeGreaterThan(unstableResult[0].confidence);
  });
});

describe("buildValueSeries", () => {
  it("sorts values by extractedAt ascending", () => {
    const metrics = [
      { metricKey: "output_count", metricValue: 5, extractedAt: new Date("2026-04-25") },
      { metricKey: "output_count", metricValue: 10, extractedAt: new Date("2026-04-23") },
      { metricKey: "output_count", metricValue: 8, extractedAt: new Date("2026-04-24") },
    ];
    const result = buildValueSeries(metrics);
    expect(result.get("output_count")).toEqual([10, 8, 5]);
  });
});
