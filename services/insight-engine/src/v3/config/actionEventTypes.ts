export const ActionEvents = Object.freeze({
  // generateActions pipeline
  STARTED:              "action_engine.started",
  COMPLETED:            "action_engine.completed",
  FAILED:               "action_engine.failed",

  // routing
  ROUTING:                 "action_engine.routing",
  QUEUED_FOR_APPROVAL:     "action_engine.queued_for_approval",
  AUTO_EXECUTED:           "action_engine.auto_executed",
  AUTO_SKIPPED:            "action_engine.auto_skipped",
  BLOCKED_BY_GOVERNANCE:   "action_engine.blocked_by_governance",

  // feedback
  ACCURACY_EVALUATED:   "action_engine.accuracy_evaluated",
} as const);

export type ActionEvent = typeof ActionEvents[keyof typeof ActionEvents];
