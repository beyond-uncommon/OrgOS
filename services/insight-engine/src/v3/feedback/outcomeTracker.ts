import { prisma } from "@orgos/db";
import { normalizeEngagementScore } from "@orgos/utils";
import type { ForecastedTrend } from "@orgos/shared-types";

/**
 * Materializes actual metric values at a forecast's horizon date and
 * records them against the predicted values for accuracy evaluation.
 *
 * Called by a scheduled job after the horizon window has elapsed.
 */
export async function recordOutcomes(
  departmentId: string,
  forecastRunId: string,
  forecastedTrends: ForecastedTrend[],
  horizonDate: Date
): Promise<void> {
  for (const trend of forecastedTrends) {
    const actual = await resolveActualValue(departmentId, trend.metricKey, horizonDate);
    if (actual === null) continue;

    await prisma.outcomeRecord.create({
      data: {
        departmentId,
        forecastRunId,
        metricKey:       trend.metricKey,
        predictedValue:  trend.projectedValue7Days, // use 7D projection for short-horizon tracking
        actualValue:     actual,
        forecastHorizon: "7D",
        measuredAt:      horizonDate,
      },
    });
  }
}

async function resolveActualValue(
  departmentId: string,
  metricKey: string,
  atDate: Date
): Promise<number | null> {
  const window = new Date(atDate);
  window.setDate(window.getDate() - 3); // ±3 day tolerance around horizon

  const metrics = await prisma.extractedMetric.findMany({
    where: {
      metricKey,
      entry: { departmentId, date: { gte: window, lte: atDate } },
      flagged: false,
    },
    select: { metricValue: true },
  });

  if (metrics.length === 0) return null;

  const values = metrics
    .map((m) => toNumeric(metricKey, m.metricValue))
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
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
