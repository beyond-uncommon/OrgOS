import type { AnomalyResult, RecurrenceRisk, AnomalyType, MetricKey } from "@orgos/shared-types";
import { recurrenceProbability, historicalFrequency } from "../models/recurrenceModel.js";

interface RecurrenceGroup {
  anomalyType: AnomalyType;
  metricKey?: MetricKey;
  occurrenceDates: Date[];
}

/**
 * Groups historical anomalies by type+metricKey, then applies the Poisson
 * recurrence model to estimate probability of re-occurrence within each horizon.
 *
 * Pure function — no DB access.
 */
export function predictAnomalyRecurrence(
  anomalyHistory: AnomalyResult[],
  referenceDate: Date
): RecurrenceRisk[] {
  const groups = buildRecurrenceGroups(anomalyHistory);

  return groups
    .filter((g) => g.occurrenceDates.length >= 2) // need at least 2 occurrences to model recurrence
    .map((g) => ({
      anomalyType: g.anomalyType,
      metricKey: g.metricKey,
      probabilityNext7Days:  round(recurrenceProbability(g.occurrenceDates, referenceDate, 7)),
      probabilityNext30Days: round(recurrenceProbability(g.occurrenceDates, referenceDate, 30)),
      historicalFrequency:   historicalFrequency(g.occurrenceDates, referenceDate),
    }));
}

function buildRecurrenceGroups(anomalies: AnomalyResult[]): RecurrenceGroup[] {
  const map = new Map<string, RecurrenceGroup>();

  for (const a of anomalies) {
    const key = `${a.anomalyType}|${a.metricKey ?? ""}`;
    const group = map.get(key) ?? {
      anomalyType: a.anomalyType,
      metricKey: a.metricKey,
      occurrenceDates: [],
    };
    group.occurrenceDates.push(a.detectedAt);
    map.set(key, group);
  }

  return [...map.values()];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
