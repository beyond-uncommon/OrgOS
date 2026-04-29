import { describe, it, expect } from "vitest";
import { synthesizeForwardRisks } from "../synthesizer/forwardRiskSynthesizer.js";
import type { ForecastedTrend, RecurrenceRisk, RiskEscalationForecast } from "@orgos/shared-types";

const noTrends: ForecastedTrend[] = [];
const noRecurrences: RecurrenceRisk[] = [];
const noEscalations: RiskEscalationForecast[] = [];

function makeTrend(overrides: Partial<ForecastedTrend>): ForecastedTrend {
  return {
    metricKey: "attendance_rate",
    direction: "DOWN",
    confidence: 0.75,
    projectedValue7Days: 65,
    projectedValue30Days: 55,
    volatilityDamping: 0.9,
    ...overrides,
  };
}

describe("synthesizeForwardRisks", () => {
  it("produces ENGAGEMENT risk for declining attendance_rate", () => {
    const signals = synthesizeForwardRisks([makeTrend({ metricKey: "attendance_rate", direction: "DOWN" })], noRecurrences, noEscalations);
    expect(signals.some((s) => s.category === "ENGAGEMENT")).toBe(true);
  });

  it("produces OPERATIONAL risk for rising dropout_count", () => {
    const signals = synthesizeForwardRisks(
      [makeTrend({ metricKey: "dropout_count", direction: "UP" })],
      noRecurrences,
      noEscalations
    );
    expect(signals.some((s) => s.category === "OPERATIONAL")).toBe(true);
  });

  it("skips STABLE trends", () => {
    const signals = synthesizeForwardRisks(
      [makeTrend({ direction: "STABLE" })],
      noRecurrences,
      noEscalations
    );
    expect(signals.filter((s) => s.description.includes("attendance_rate"))).toHaveLength(0);
  });

  it("sorts by likelihood descending", () => {
    const recurrences: RecurrenceRisk[] = [
      { anomalyType: "SPIKE", probabilityNext7Days: 0.8, probabilityNext30Days: 0.95, historicalFrequency: 6 },
      { anomalyType: "GAP",   probabilityNext7Days: 0.3, probabilityNext30Days: 0.6,  historicalFrequency: 3 },
    ];
    const signals = synthesizeForwardRisks(noTrends, recurrences, noEscalations);
    expect(signals[0].likelihood).toBeGreaterThanOrEqual(signals[1]?.likelihood ?? 0);
  });

  it("returns empty for no signals", () => {
    expect(synthesizeForwardRisks(noTrends, noRecurrences, noEscalations)).toHaveLength(0);
  });
});
