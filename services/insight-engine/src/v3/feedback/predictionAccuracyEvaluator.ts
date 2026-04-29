import { prisma } from "@orgos/db";
import type { PredictionAccuracyScore, ForecastHorizon } from "@orgos/shared-types";
import { log } from "@orgos/utils";
import { ActionEvents } from "../config/actionEventTypes.js";

/**
 * Loads outcome records for a forecast run and computes accuracy scores.
 * These scores feed back into v2 model calibration (future: adjust α/β in Holt smoothing).
 */
export async function evaluatePredictionAccuracy(
  forecastRunId: string
): Promise<PredictionAccuracyScore[]> {
  const outcomes = await prisma.outcomeRecord.findMany({
    where: { forecastRunId },
  });

  const scores: PredictionAccuracyScore[] = outcomes.map((o) => {
    const absPercentError =
      o.actualValue !== 0
        ? Math.abs(o.actualValue - o.predictedValue) / Math.abs(o.actualValue)
        : Math.abs(o.predictedValue) > 0 ? 1 : 0;

    return {
      forecastRunId,
      metricKey:      o.metricKey,
      horizon:        o.forecastHorizon as ForecastHorizon,
      predictedValue: o.predictedValue,
      actualValue:    o.actualValue,
      absPercentError: Math.round(absPercentError * 1000) / 1000,
      drift:          Math.round((o.actualValue - o.predictedValue) * 1000) / 1000,
    };
  });

  if (scores.length > 0) {
    const avgError = scores.reduce((s, sc) => s + sc.absPercentError, 0) / scores.length;
    log(ActionEvents.ACCURACY_EVALUATED, {
      forecastRunId,
      outcomeCount:        scores.length,
      avgAbsPercentError:  Math.round(avgError * 1000) / 1000,
      systematicDrift:     scores.some((s) => Math.abs(s.drift) > 0.2),
    });
  }

  return scores;
}

/**
 * Aggregates accuracy scores across multiple runs for a department,
 * returning per-metric mean absolute percentage error.
 */
export async function getDepartmentAccuracySummary(
  departmentId: string,
  horizon: ForecastHorizon = "7D"
): Promise<Record<string, number>> {
  const outcomes = await prisma.outcomeRecord.findMany({
    where: { departmentId, forecastHorizon: horizon },
  });

  const byMetric: Record<string, number[]> = {};
  for (const o of outcomes) {
    const ape =
      o.actualValue !== 0
        ? Math.abs(o.actualValue - o.predictedValue) / Math.abs(o.actualValue)
        : 0;
    (byMetric[o.metricKey] ??= []).push(ape);
  }

  return Object.fromEntries(
    Object.entries(byMetric).map(([key, errors]) => [
      key,
      Math.round((errors.reduce((a, b) => a + b, 0) / errors.length) * 1000) / 1000,
    ])
  );
}
