import { prisma, EntryStatus } from "@orgos/db";
import { logError, withRetry } from "@orgos/utils";
import type { DailyEntry } from "@orgos/shared-types";

export async function runSubmissionPipeline(
  entry: DailyEntry,
  departmentId: string,
): Promise<void> {
  const pipelineResult = await withRetry(async () => {
    const { extractMetrics } = await import("@orgos/metric-extraction");
    const extractionResult = await extractMetrics(entry);
    if (!extractionResult.success) throw new Error(extractionResult.error);

    const { refreshDepartmentSnapshot } = await import("@orgos/dashboard-engine");
    await refreshDepartmentSnapshot(departmentId, entry.date);
  }, { label: "submission_pipeline", maxRetries: 3, baseDelayMs: 2000 });

  if (!pipelineResult.success) {
    logError("submission_pipeline.failed", new Error(pipelineResult.error), {
      entryId: entry.id,
      departmentId,
    });
    await prisma.dailyEntry.update({
      where: { id: entry.id },
      data: { status: EntryStatus.FLAGGED },
    }).catch(() => undefined);
  }
}
