"use server";

import { prisma, EntryStatus } from "@orgos/db";
import { toDateOnly, logError } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";
import type { DailyEntry } from "@orgos/shared-types";
import { dailyEntryFormSchema } from "../schema";

export async function submitDailyEntry(
  userId: string,
  departmentId: string,
  formData: unknown,
): Promise<ActionResult<DailyEntry>> {
  const parsed = dailyEntryFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { date, ...fields } = parsed.data;
  const entryDate = toDateOnly(date);

  const existing = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: entryDate } },
  });
  if (existing) {
    return { success: false, error: "Entry already submitted for this date." };
  }

  const entry = await prisma.dailyEntry.create({
    data: {
      userId,
      departmentId,
      date: entryDate,
      status: EntryStatus.SUBMITTED,
      attendanceStatus: fields.attendanceStatus,
      outputCompleted: fields.outputCompleted,
      blockers: fields.blockers,
      engagementNotes: fields.engagementNotes,
      quickSummary: fields.quickSummary,
      totalStudents: fields.totalStudents ?? null,
      studentsPresent: fields.studentsPresent ?? null,
      dropouts: fields.dropouts ?? null,
      maleStudents: fields.maleStudents ?? null,
      femaleStudents: fields.femaleStudents ?? null,
      otherGender: fields.otherGender ?? null,
      averageAge: fields.averageAge ?? null,
      mentorshipPairs: fields.mentorshipPairs ?? null,
      engagementScore: fields.engagementScore ?? null,
      guestsVisited: fields.guestsVisited,
      guestNotes: fields.guestNotes ?? null,
      reportType: fields.reportType,
      ...(fields.studentsInvolvedIds?.length ? { studentsInvolvedIds: fields.studentsInvolvedIds } : {}),
      ...(fields.dropoutStudentIds?.length ? { dropoutStudentIds: fields.dropoutStudentIds } : {}),
      ...(fields.dropoutReasons && Object.keys(fields.dropoutReasons).length ? { dropoutReasons: fields.dropoutReasons } : {}),
    },
  });

  // Fire-and-forget pipeline. Safe in a persistent Node.js process.
  // Dynamic imports prevent webpack from bundling service ESM packages at build time.
  void (async () => {
    try {
      const { extractMetrics } = await import("@orgos/metric-extraction");
      await extractMetrics(entry);
      const { refreshDepartmentSnapshot } = await import("@orgos/dashboard-engine");
      await refreshDepartmentSnapshot(departmentId, entry.date);
    } catch (err) {
      logError("submit_daily_entry.pipeline_error", err, { entryId: entry.id });
    }
  })();

  return { success: true, data: entry };
}
