"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";
import { studentRegistrationSchema } from "../schema";

export async function registerStudent(
  formData: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  const sessionUser = await requireSession();
  const instructorId = sessionUser.id;
  const departmentId = sessionUser.departmentId ?? undefined;
  if (!departmentId) return { success: false, error: "No department assigned." };

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
