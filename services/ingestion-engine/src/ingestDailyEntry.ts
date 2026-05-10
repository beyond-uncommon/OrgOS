import { prisma, EntryStatus } from "@orgos/db";
import { toDateOnly, type ActionResult } from "@orgos/utils";
import type { DailyEntry } from "@orgos/shared-types";
import { validateEntry } from "./validateEntry.js";

export async function ingestDailyEntry(
  input: unknown
): Promise<ActionResult<DailyEntry>> {
  const validation = validateEntry(input);
  if (!validation.success) return validation;

  const { userId, departmentId, date, ...fields } = validation.data;
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

  return { success: true, data: entry };
}
