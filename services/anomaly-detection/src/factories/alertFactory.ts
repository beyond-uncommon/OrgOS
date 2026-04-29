import { createHash } from "node:crypto";
import { prisma, AlertType, Severity } from "@orgos/db";
import type { AnomalyResult } from "@orgos/shared-types";
import type { AnomalyMetadata } from "@orgos/shared-types";
import { createAlert } from "@orgos/intervention-engine";
import { resolveSeverity } from "../config/severityRules.js";

const RULE_VERSION = "anomaly-rules-v1";

function buildAnomalyId(anomaly: AnomalyResult): string {
  const parts = [
    anomaly.anomalyType,
    anomaly.entryId ?? "",
    anomaly.metricKey ?? "",
    anomaly.detectionWindow ?? "",
  ].join("|");
  return createHash("sha256").update(parts).digest("hex");
}

function toAlertType(anomaly: AnomalyResult): AlertType {
  switch (anomaly.anomalyType) {
    case "MISSING_ENTRY": return AlertType.MISSING_ENTRY;
    case "INCONSISTENCY":  return AlertType.INCONSISTENCY;
    default:               return AlertType.ANOMALY;
  }
}

export async function createAlertsFromAnomalies(
  anomalies: AnomalyResult[],
  autoAssignTo?: string
): Promise<void> {
  for (const anomaly of anomalies) {
    const anomalyId = buildAnomalyId(anomaly);

    const existing = await prisma.alert.findFirst({
      where: {
        resolved: false,
        metadata: { path: ["anomalyId"], equals: anomalyId },
      },
      select: { id: true },
    });

    if (existing) continue;

    // Full AnomalyResult stored alongside identity fields so the insight engine
    // can reconstruct anomalies from alert metadata without a separate store.
    const metadata: AnomalyMetadata & Record<string, unknown> = {
      anomalyId,
      ruleVersion: RULE_VERSION,
      anomalyType: anomaly.anomalyType,
      metricKey: anomaly.metricKey,
      entryId: anomaly.entryId,
      userId: anomaly.userId,
      description: anomaly.description,
      detectedAt: anomaly.detectedAt.toISOString(),
      detectionWindow: anomaly.detectionWindow,
      consecutiveDays: anomaly.consecutiveDays,
    };
    const severity: Severity = resolveSeverity(anomaly);

    await createAlert({
      type: toAlertType(anomaly),
      severity,
      ...(anomaly.entryId ? { entryId: anomaly.entryId } : {}),
      metadata,
      ...(autoAssignTo ? { autoAssignTo } : {}),
    });
  }
}
