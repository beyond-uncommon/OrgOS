/**
 * Exponential decay — weight of a historical observation decreases as it ages.
 * Used to down-weight old anomalies when estimating recurrence probability.
 *
 * halfLife: the number of days at which a signal retains 50% of its weight.
 */
export function decayWeight(ageInDays: number, halfLife = 14): number {
  return Math.pow(0.5, ageInDays / halfLife);
}

/**
 * Weighted frequency: sum of decay-weighted occurrences per day over a window.
 * Returns a per-day rate, not a raw count.
 */
export function weightedFrequency(
  occurrenceDates: Date[],
  referenceDate: Date,
  halfLife = 14
): number {
  const windowDays = 30;
  const total = occurrenceDates.reduce((sum, date) => {
    const ageInDays = (referenceDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 0 || ageInDays > windowDays) return sum;
    return sum + decayWeight(ageInDays, halfLife);
  }, 0);
  return total / windowDays; // normalize to per-day rate
}
