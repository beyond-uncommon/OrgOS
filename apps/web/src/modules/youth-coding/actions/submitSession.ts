"use server";

import { prisma, ProjectStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
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

  // Validate instructorIds belong to this department
  const validUsers = await prisma.user.findMany({
    where: { departmentId, id: { in: phase1.instructorIds } },
    select: { id: true },
  });
  if (validUsers.length !== phase1.instructorIds.length) {
    return { success: false, error: "One or more instructor IDs are invalid for this department." };
  }

  // Register any new students first
  const newStudentIds: string[] = [];
  if (newStudents?.length) {
    for (const s of newStudents) {
      const created = await prisma.student.create({
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

  // Build attendance rows (only present students)
  const presentAttendance = attendance.filter(a => a.present);

  const session = await prisma.youthCodingSession.create({
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

  return { success: true, data: session };
}
