export const ForecastEvents = Object.freeze({
  STARTED:             "forecast_engine.started",
  COMPLETED:           "forecast_engine.completed",
  FAILED:              "forecast_engine.failed",
  NARRATIVE_GENERATED: "forecast_engine.narrative_generated",
} as const);

export type ForecastEvent = typeof ForecastEvents[keyof typeof ForecastEvents];
