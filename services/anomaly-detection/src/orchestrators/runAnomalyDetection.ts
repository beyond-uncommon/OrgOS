import { randomUUID } from "node:crypto";
import { prisma } from "@orgos/db";
import type { AnomalyResult } from "@orgos/shared-types";
import { log, logError } from "@orgos/utils";
import { AnomalyEvents } from "../config/eventTypes.js";
import { detectSpike } from "../detectors/detectSpike.js";
import { detectGap } from "../detectors/detectGap.js";
import { detectInconsistency } from "../detectors/detectInconsistency.js";
import { createAlertsFromAnomalies } from "../factories/alertFactory.js";

const HISTORY_DAYS = 14;

export async function runAnomalyDetection(entryId: string): Promise<void> {
  const anomalyRunId = randomUUID();
  const run = Object.freeze({ anomalyRunId, entryId, logVersion: 1 });

  log(AnomalyEvents.TRIGGERED, run);

  const entry = await prisma.dailyEntry.findUniqueOrThrow({
    where: { id: entryId },
  });

  const currentMetrics = await prisma.extractedMetric.findMany({
    where: { entryId },
  });

  const historyFrom = new Date(entry.date);
  historyFrom.setDate(historyFrom.getDate() - HISTORY_DAYS);

  const history = await prisma.extractedMetric.findMany({
    where: {
      entry: {
        userId: entry.userId,
        date: { gte: historyFrom, lt: entry.date },
      },
    },
  });

  const detectorInputs = { entry, currentMetrics, history };

  const settled = await Promise.allSettled([
    Promise.resolve(detectSpike(detectorInputs)),
    Promise.resolve(detectGap(detectorInputs)),
    Promise.resolve(detectInconsistency({ entry, currentMetrics })),
  ]);

  const detectorNames = ["detectSpike", "detectGap", "detectInconsistency"];
  const anomalies: AnomalyResult[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result?.status === "fulfilled") {
      anomalies.push(...result.value);
    } else if (result?.status === "rejected") {
      logError(AnomalyEvents.DETECTOR_FAILED, result.reason, {
        ...run,
        detector: detectorNames[i],
      });
    }
  }

  log(AnomalyEvents.COMPLETED, {
    ...run,
    userId: entry.userId,
    departmentId: entry.departmentId,
    anomalyCount: anomalies.length,
    anomalyTypes: anomalies.map((a) => a.anomalyType),
  });

  if (anomalies.length > 0) {
    await createAlertsFromAnomalies(anomalies);
    log(AnomalyEvents.ALERTS_CREATED, { ...run, count: anomalies.length });
  }
}
