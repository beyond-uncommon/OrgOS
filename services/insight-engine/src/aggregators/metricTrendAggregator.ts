import type { InsightContext } from "@orgos/shared-types";
import { normalizeEngagementScore } from "@orgos/utils";

export interface MetricTrendSummary {
  metricKey: string;
  average: number;
  min: number;
  max: number;
  /** Normalized linear slope — positive = rising, negative = falling */
  trend: number;
  /** Standard deviation of values — higher = more volatile */
  volatility: number;
  /** Average of second half vs first half of the window */
  weekOverWeekDelta: number;
  dataPoints: number;
}

/**
 * Computes statistical trend summaries per metric.
 * Pure function — no DB access, no interpretation.
 */
export function aggregateMetricTrends(context: InsightContext): MetricTrendSummary[] {
  const byKey = new Map<string, { value: number; t: number }[]>();

  for (const m of context.metrics) {
    const value = toNumeric(m.metricKey, m.metricValue);
    if (value === null) continue;
    const bucket = byKey.get(m.metricKey) ?? [];
    bucket.push({ value, t: m.extractedAt.getTime() });
    byKey.set(m.metricKey, bucket);
  }

  const summaries: MetricTrendSummary[] = [];

  for (const [metricKey, points] of byKey) {
    if (points.length === 0) continue;

    const sorted = [...points].sort((a, b) => a.t - b.t);
    const values = sorted.map((p) => p.value);
    const n = values.length;

    const average = values.reduce((a, b) => a + b, 0) / n;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const trend = linearSlope(sorted);
    const volatility = standardDeviation(values, average);
    const weekOverWeekDelta = computeHalfWindowDelta(values);

    summaries.push({ metricKey, average, min, max, trend, volatility, weekOverWeekDelta, dataPoints: n });
  }

  return summaries;
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

function linearSlope(points: { value: number; t: number }[]): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const meanT = points.reduce((s, p) => s + p.t, 0) / n;
  const meanV = points.reduce((s, p) => s + p.value, 0) / n;
  const num = points.reduce((s, p) => s + (p.t - meanT) * (p.value - meanV), 0);
  const den = points.reduce((s, p) => s + (p.t - meanT) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function standardDeviation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Compares average of second half vs first half — positive = improving, negative = declining */
function computeHalfWindowDelta(values: number[]): number {
  if (values.length < 2) return 0;
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return avg(secondHalf) - avg(firstHalf);
}
