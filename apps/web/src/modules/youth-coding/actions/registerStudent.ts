"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { studentRegistrationSchema } from "../schema";

export async function registerStudent(
  instructorId: string,
  departmentId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = studentRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const student = await prisma.student.create({
      data: {
        name: parsed.data.name,
        age: parsed.data.age,
        gender: parsed.data.gender,
        school: parsed.data.school,
        grade: parsed.data.grade,
        community: parsed.data.community,
        departmentId,
        instructorId,
        enrollmentStatus: "ACTIVE",
      },
      select: { id: true, name: true },
    });

    return { success: true, data: student };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message };
  }
}
