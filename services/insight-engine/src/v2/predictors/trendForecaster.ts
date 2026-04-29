import type { ForecastedTrend, ForecastDirection } from "@orgos/shared-types";
import type { MetricTrendSummary } from "../../aggregators/metricTrendAggregator.js";
import { forecast, volatilityDamping } from "../models/momentumModel.js";
import { normalizeEngagementScore } from "@orgos/utils";

// 7 days = 1 step, 30 days ≈ 4.3 steps, relative to weekly data cadence
const STEPS_7D  = 1;
const STEPS_30D = 4;

/**
 * Runs Holt exponential smoothing over each metric's value series.
 * Confidence is damped by volatility — an unstable series produces a less
 * trustworthy forecast even if the direction is clear.
 *
 * Pure function — no DB access, no side effects.
 */
export function forecastTrends(
  trends: MetricTrendSummary[],
  metricValueSeries: Map<string, number[]>
): ForecastedTrend[] {
  return trends.flatMap((summary) => {
    const series = metricValueSeries.get(summary.metricKey);
    if (!series || series.length < 3) return [];

    const damping = volatilityDamping(series);
    const f7  = forecast(series, STEPS_7D);
    const f30 = forecast(series, STEPS_30D);

    const direction = classifyDirection(summary.trend, f30.acceleration);
    const baseConfidence = Math.min(0.5 + (series.length / 20), 0.9);

    return [{
      metricKey: summary.metricKey,
      direction,
      confidence: baseConfidence * damping,
      projectedValue7Days:  round(f7.projected),
      projectedValue30Days: round(f30.projected),
      volatilityDamping: damping,
    } satisfies ForecastedTrend];
  });
}

/**
 * Builds the value series Map from raw metric rows.
 * Engagement scores are normalized to numeric (LOW=0, MED=1, HIGH=2).
 */
export function buildValueSeries(
  metrics: { metricKey: string; metricValue: unknown; extractedAt: Date }[]
): Map<string, number[]> {
  const byKey = new Map<string, { value: number; t: number }[]>();

  for (const m of metrics) {
    const value = toNumeric(m.metricKey, m.metricValue);
    if (value === null) continue;
    const bucket = byKey.get(m.metricKey) ?? [];
    bucket.push({ value, t: m.extractedAt.getTime() });
    byKey.set(m.metricKey, bucket);
  }

  const result = new Map<string, number[]>();
  for (const [key, points] of byKey) {
    result.set(
      key,
      points.sort((a, b) => a.t - b.t).map((p) => p.value)
    );
  }
  return result;
}

function classifyDirection(slope: number, acceleration: number): ForecastDirection {
  // acceleration adds to slope to detect accelerating declines/rises
  const signal = slope + acceleration * 0.5;
  if (signal > 1e-9)  return "UP";
  if (signal < -1e-9) return "DOWN";
  return "STABLE";
}

function toNumeric(key: string, value: unknown): number | null {
  if (key === "engagement_score") {
    try { return normalizeEngagementScore(value); } catch { return null; }
  }
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
