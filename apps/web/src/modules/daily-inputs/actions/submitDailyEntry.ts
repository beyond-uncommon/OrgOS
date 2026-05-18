"use server";

import { prisma, EntryStatus } from "@orgos/db";
import { logError, withRetry } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { DailyEntry } from "@orgos/shared-types";
import { dailyEntryFormSchema } from "../schema";
import { requireSession } from "@/lib/auth/requireSession";

export async function submitDailyEntry(
  formData: unknown,
): Promise<ActionResult<DailyEntry>> {
  const sessionUser = await requireSession();
  const userId = sessionUser.id;
  const departmentId = sessionUser.departmentId ?? undefined;
  if (!departmentId) return { success: false, error: "No department assigned." };

  const parsed = dailyEntryFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { ingestDailyEntry } = await import("@orgos/ingestion-engine");
  const result = await ingestDailyEntry({ userId, departmentId, ...parsed.data });
  if (!result.success) return result;

  const entry = result.data;

  // Fire-and-forget pipeline with retry. Safe in a persistent Node.js process.
  // Dynamic imports prevent webpack from bundling service ESM packages at build time.
  void (async () => {
    const pipelineResult = await withRetry(async () => {
      const { extractMetrics } = await import("@orgos/metric-extraction");
      const extractionResult = await extractMetrics(entry);
      if (!extractionResult.success) throw new Error(extractionResult.error);

      const { refreshDepartmentSnapshot } = await import("@orgos/dashboard-engine");
      await refreshDepartmentSnapshot(departmentId, entry.date);
    }, { label: "daily_entry_pipeline", maxRetries: 3, baseDelayMs: 2000 });

    if (!pipelineResult.success) {
      logError("submit_daily_entry.pipeline_failed", new Error(pipelineResult.error), { entryId: entry.id });
      await prisma.dailyEntry.update({
        where: { id: entry.id },
        data: { status: EntryStatus.FLAGGED },
      }).catch(() => undefined);
    }
  })();

  return { success: true, data: entry };
}
