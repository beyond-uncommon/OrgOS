import { prisma } from "@orgos/db";
import { getMonthBounds, log, logError } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { InsightReport } from "@orgos/shared-types";
import { InsightEvents } from "../config/insightEventTypes.js";
import { buildInsightContext } from "../aggregators/contextAggregator.js";
import { runInsightEngine } from "../insightEngine.js";

export async function generateMonthlyInsights(
  departmentId: string,
  year: number,
  month: number
): Promise<ActionResult<InsightReport>> {
  const { start, end } = getMonthBounds(year, month);
  const run = Object.freeze({ departmentId, year, month });

  log(InsightEvents.STARTED, { ...run, type: "MONTHLY" });

  try {
    const context = await buildInsightContext(departmentId, start, end);
    const report = await runInsightEngine(context, "MONTHLY");

    await prisma.dashboardSnapshot.create({
      data: {
        departmentId,
        scope: "DEPARTMENT",
        periodType: "MONTHLY",
        periodStart: start,
        data: report as object,
      },
    });

    log(InsightEvents.COMPLETED, {
      ...run,
      type: "MONTHLY",
      patternCount: report.insights.length,
      riskCount: report.risks.length,
      confidence: report.confidence,
    });

    return { success: true, data: report };
  } catch (err) {
    logError(InsightEvents.FAILED, err, { ...run, type: "MONTHLY" });
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
