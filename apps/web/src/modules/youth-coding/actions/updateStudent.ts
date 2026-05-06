"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { studentRegistrationSchema } from "../schema";

export async function updateStudent(
  studentId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = studentRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const student = await prisma.student.update({
    where: { id: studentId },
    data: parsed.data,
    select: { id: true },
  });

  return { success: true, data: student };
}
