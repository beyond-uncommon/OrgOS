export const InsightEvents = Object.freeze({
  STARTED:            "insight_engine.started",
  COMPLETED:          "insight_engine.completed",
  FAILED:             "insight_engine.failed",
  NARRATIVE_GENERATED: "insight_engine.narrative_generated",
} as const);

export type InsightEvent = typeof InsightEvents[keyof typeof InsightEvents];
