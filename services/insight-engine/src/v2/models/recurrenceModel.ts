import { weightedFrequency } from "./decayModel.js";

/**
 * Converts a per-day weighted frequency rate into a probability of at least
 * one occurrence within a horizon window.
 *
 * Uses the Poisson CDF complement: P(X >= 1) = 1 - e^(-λt)
 * where λ = per-day rate and t = horizon in days.
 */
export function recurrenceProbability(
  occurrenceDates: Date[],
  referenceDate: Date,
  horizonDays: number
): number {
  const rate = weightedFrequency(occurrenceDates, referenceDate);
  if (rate === 0) return 0;
  const lambda = rate * horizonDays;
  return 1 - Math.exp(-lambda);
}

/**
 * Historical frequency: raw count per 30-day window, unweighted.
 * Used as the human-readable baseline in RecurrenceRisk.
 */
export function historicalFrequency(occurrenceDates: Date[], referenceDate: Date): number {
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  return occurrenceDates.filter(
    (d) => referenceDate.getTime() - d.getTime() <= windowMs
  ).length;
}
