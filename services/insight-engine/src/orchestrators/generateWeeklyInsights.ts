import { prisma } from "@orgos/db";
import { getWeekBounds, log, logError } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { InsightReport } from "@orgos/shared-types";
import { InsightEvents } from "../config/insightEventTypes.js";
import { buildInsightContext } from "../aggregators/contextAggregator.js";
import { runInsightEngine } from "../insightEngine.js";

export async function generateWeeklyInsights(
  departmentId: string,
  weekOf: Date
): Promise<ActionResult<InsightReport>> {
  const { weekStart, weekEnd } = getWeekBounds(weekOf);
  const run = Object.freeze({ departmentId, weekStart: weekStart.toISOString() });

  log(InsightEvents.STARTED, { ...run, type: "WEEKLY" });

  try {
    const context = await buildInsightContext(departmentId, weekStart, weekEnd);
    const report = await runInsightEngine(context, "WEEKLY");

    await prisma.dashboardSnapshot.create({
      data: {
        departmentId,
        scope: "DEPARTMENT",
        periodType: "WEEKLY",
        periodStart: weekStart,
        data: report as object,
      },
    });

    log(InsightEvents.COMPLETED, {
      ...run,
      type: "WEEKLY",
      patternCount: report.insights.length,
      riskCount: report.risks.length,
      confidence: report.confidence,
    });

    return { success: true, data: report };
  } catch (err) {
    logError(InsightEvents.FAILED, err, { ...run, type: "WEEKLY" });
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
