"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { studentRegistrationSchema } from "../schema";

export async function updateStudent(
  studentId: string,
  callerUserId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = studentRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: { instructorId: true },
  });

  if (!existing) {
    return { success: false, error: "Student not found." };
  }

  if (existing.instructorId !== callerUserId) {
    return { success: false, error: "Not authorized to edit this student." };
  }

  try {
    const student = await prisma.student.update({
      where: { id: studentId },
      data: parsed.data,
      select: { id: true },
    });

    return { success: true, data: student };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message };
  }
}
