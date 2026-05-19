"use server";

import { prisma, EntryStatus } from "@orgos/db";
import { logError, withRetry } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { DailyEntry } from "@orgos/shared-types";
import { dailyEntryFormSchema } from "../schema";
import { requireSession } from "@/lib/auth/requireSession";
import { runSubmissionPipeline } from "@/lib/pipeline/submissionPipeline";
import { generateQuickSummary } from "@/lib/ai/generateQuickSummary";

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

  const quickSummary = await generateQuickSummary({
    attendanceStatus: parsed.data.attendanceStatus,
    outputCompleted: parsed.data.outputCompleted,
    blockers: parsed.data.blockers,
    engagementNotes: parsed.data.engagementNotes,
    reportType: parsed.data.reportType,
  });

  const { ingestDailyEntry } = await import("@orgos/ingestion-engine");
  const result = await ingestDailyEntry({ userId, departmentId, ...parsed.data, quickSummary });
  if (!result.success) return result;

  const entry = result.data;

  void runSubmissionPipeline(entry, departmentId);

  return { success: true, data: entry };
}
