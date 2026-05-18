"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { z } from "zod";

const studentReportSchema = z.object({
  studentId: z.string().min(1),
  date: z.coerce.date(),
  learned: z.string().min(1).max(2000),
  enjoyed: z.string().min(1).max(2000),
  struggled: z.string().max(2000).optional().default(""),
  rating: z.number().int().min(1).max(5).default(3),
  imageUrls: z.array(z.string()).max(10).optional().default([]),
});

export async function submitStudentReport(
  formData: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = studentReportSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, enrollmentStatus: true },
  });
  if (!student || student.enrollmentStatus !== "ACTIVE") {
    return { success: false, error: "Student not found or inactive." };
  }

  const report = await prisma.studentReport.create({
    data: {
      studentId: parsed.data.studentId,
      date: parsed.data.date,
      learned: parsed.data.learned,
      enjoyed: parsed.data.enjoyed,
      struggled: parsed.data.struggled,
      rating: parsed.data.rating,
      imageUrls: parsed.data.imageUrls,
    },
    select: { id: true },
  });

  return { success: true, data: report };
}
