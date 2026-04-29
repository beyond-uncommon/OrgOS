import { Severity } from "@orgos/db";
import type { AnomalyResult } from "@orgos/shared-types";

export function resolveSeverity(anomaly: AnomalyResult): Severity {
  switch (anomaly.anomalyType) {
    case "MISSING_ENTRY": {
      const days = anomaly.consecutiveDays ?? 1;
      if (days >= 3) return Severity.CRITICAL;
      if (days === 2) return Severity.HIGH;
      return Severity.MEDIUM;
    }

    case "SPIKE": {
      const key = anomaly.metricKey;
      if (key === "dropout_count" || key === "risk_flag") return Severity.HIGH;
      if (key === "attendance_rate") return Severity.MEDIUM;
      return Severity.LOW;
    }

    case "GAP":
      return Severity.LOW;

    case "INCONSISTENCY":
      return Severity.MEDIUM;

    default:
      return Severity.LOW;
  }
}
