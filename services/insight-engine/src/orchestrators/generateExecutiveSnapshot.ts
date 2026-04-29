import { randomUUID } from "node:crypto";
import { prisma } from "@orgos/db";
import { log, logError } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { InsightReport, InsightContext } from "@orgos/shared-types";
import { InsightEvents } from "../config/insightEventTypes.js";
import { buildInsightContext } from "../aggregators/contextAggregator.js";
import { runInsightEngine } from "../insightEngine.js";

export async function generateExecutiveSnapshot(
  from: Date,
  to: Date
): Promise<ActionResult<InsightReport>> {
  const snapshotRunId = randomUUID();
  const run = Object.freeze({ snapshotRunId, from: from.toISOString(), to: to.toISOString() });

  log(InsightEvents.STARTED, { ...run, type: "EXECUTIVE" });

  try {
    const departments = await prisma.department.findMany({ select: { id: true } });

    const contexts = await Promise.all(
      departments.map((d) => buildInsightContext(d.id, from, to))
    );

    const merged = mergeContexts(contexts, from, to);
    const report = await runInsightEngine(merged, "EXECUTIVE");

    await prisma.dashboardSnapshot.create({
      data: {
        scope: "ORGANIZATION",
        periodType: "WEEKLY",
        periodStart: from,
        data: report as object,
      },
    });

    log(InsightEvents.COMPLETED, {
      ...run,
      type: "EXECUTIVE",
      departmentCount: departments.length,
      riskCount: report.risks.length,
      confidence: report.confidence,
    });

    return { success: true, data: report };
  } catch (err) {
    logError(InsightEvents.FAILED, err, { ...run, type: "EXECUTIVE" });
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function mergeContexts(contexts: InsightContext[], from: Date, to: Date): InsightContext {
  return {
    departmentId: "ORGANIZATION",
    timeWindow: { from, to },
    anomalies: contexts.flatMap((c) => c.anomalies),
    alerts: contexts.flatMap((c) => c.alerts),
    metrics: contexts.flatMap((c) => c.metrics),
  };
}
