"use server";

import { prisma, ProjectStatus, EntryStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { toDateOnly } from "@orgos/utils";
import { sessionSubmissionSchema } from "../schema";

export async function submitSession(
  submittedById: string,
  departmentId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionSubmissionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { phase1, attendance, newStudents } = parsed.data;

  // Validate instructorIds belong to this department (read-only, outside transaction)
  const validUsers = await prisma.user.findMany({
    where: { departmentId, id: { in: phase1.instructorIds } },
    select: { id: true },
  });
  if (validUsers.length !== phase1.instructorIds.length) {
    return { success: false, error: "One or more instructor IDs are invalid for this department." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Register any new students first
      const newStudentIds: string[] = [];
      if (newStudents?.length) {
        for (const s of newStudents) {
          const created = await tx.student.create({
            data: {
              name: s.name,
              age: s.age,
              gender: s.gender,
              school: s.school,
              grade: s.grade,
              community: s.community,
              departmentId,
              instructorId: submittedById,
              enrollmentStatus: "ACTIVE",
            },
            select: { id: true },
          });
          newStudentIds.push(created.id);
        }
      }

      // Build attendance: existing present students + all new students
      const presentAttendance = [
        ...attendance.filter(a => a.present),
        ...newStudentIds.map(id => ({
          studentId: id,
          present: true as const,
          projectStatus: "NOT_COMPLETE" as const,
        })),
      ];

      const session = await tx.youthCodingSession.create({
        data: {
          date: new Date(phase1.date),
          lessonNumber: phase1.lessonNumber,
          projectName: phase1.projectName,
          school: phase1.school,
          community: phase1.community,
          departmentId,
          submittedById,
          instructorIds: phase1.instructorIds,
          attendance: {
            create: presentAttendance.map(a => ({
              studentId: a.studentId,
              projectStatus: a.projectStatus as ProjectStatus,
            })),
          },
        },
        select: { id: true },
      });

      // Auto-generate DailyEntry from session data
      const sessionDate = toDateOnly(new Date(phase1.date));
      const totalStudents = presentAttendance.length;
      const completedCount = presentAttendance.filter(a => a.projectStatus === "COMPLETE").length;
      const totalEnrolled = attendance.length + newStudentIds.length;

      const existingEntry = await tx.dailyEntry.findUnique({
        where: { userId_date: { userId: submittedById, date: sessionDate } },
      });

      if (!existingEntry) {
        await tx.dailyEntry.create({
          data: {
            userId: submittedById,
            departmentId,
            date: sessionDate,
            status: EntryStatus.COMPLETE,
            reportType: "SESSION",
            attendanceStatus: `${totalStudents} of ${totalEnrolled} present`,
            outputCompleted: `${completedCount} of ${totalStudents} projects completed`,
            blockers: "",
            engagementNotes: "",
            quickSummary: `YC Session ${phase1.lessonNumber}: ${phase1.projectName} at ${phase1.school}`,
            totalStudents: totalEnrolled,
            studentsPresent: totalStudents,
            studentsInvolvedIds: presentAttendance.map(a => a.studentId),
          },
        });
      }

      return { id: session.id };
    });

    return { success: true, data: result };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message };
  }
}
