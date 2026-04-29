/**
 * Exponential smoothing (Holt's linear method) — tracks both level and trend.
 * Produces a forecast N steps ahead from a series of evenly-spaced values.
 *
 * α (level smoothing): how quickly the level adapts to new values (0–1)
 * β (trend smoothing): how quickly the trend adapts (0–1)
 */
export interface SmoothedState {
  level: number;
  trend: number;
}

export function initSmoothedState(values: number[]): SmoothedState {
  if (values.length < 2) {
    return { level: values[0] ?? 0, trend: 0 };
  }
  return {
    level: values[0],
    trend: values[1] - values[0],
  };
}

export function smoothStep(
  state: SmoothedState,
  observed: number,
  alpha = 0.3,
  beta = 0.2
): SmoothedState {
  const level = alpha * observed + (1 - alpha) * (state.level + state.trend);
  const trend = beta * (level - state.level) + (1 - beta) * state.trend;
  return { level, trend };
}

/**
 * Runs the full smoothing pass over a value series, then projects h steps ahead.
 * Returns the projected value and the final smoothed state (for confidence checks).
 */
export function forecast(values: number[], stepsAhead: number, alpha = 0.3, beta = 0.2): {
  projected: number;
  state: SmoothedState;
  acceleration: number;
} {
  if (values.length === 0) return { projected: 0, state: { level: 0, trend: 0 }, acceleration: 0 };

  let state = initSmoothedState(values);
  let prevTrend = state.trend;

  for (let i = 1; i < values.length; i++) {
    state = smoothStep(state, values[i], alpha, beta);
  }

  const acceleration = state.trend - prevTrend;
  const projected = state.level + state.trend * stepsAhead;

  return { projected, state, acceleration };
}

/**
 * Confidence damping from volatility — high standard deviation relative to mean
 * reduces forecast confidence proportionally.
 */
export function volatilityDamping(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0.5;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / Math.abs(mean); // coefficient of variation
  return Math.max(0.1, 1 - Math.min(cv, 0.9));
}
