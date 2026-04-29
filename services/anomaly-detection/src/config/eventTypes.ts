export const AnomalyEvents = Object.freeze({
  // runAnomalyDetection
  TRIGGERED:        "anomaly_detection.triggered",
  DETECTOR_FAILED:  "anomaly_detection.detector_failed",
  COMPLETED:        "anomaly_detection.completed",
  ALERTS_CREATED:   "anomaly_detection.alerts_created",

  // runEndOfDayChecks
  EOD_TRIGGERED:          "end_of_day_checks.triggered",
  EOD_DEPARTMENT_COMPLETE: "end_of_day_checks.department_complete",
  EOD_DEPARTMENT_FAILED:   "end_of_day_checks.department_failed",
  EOD_COMPLETED:           "end_of_day_checks.completed",
} as const);

export type AnomalyEvent = typeof AnomalyEvents[keyof typeof AnomalyEvents];
