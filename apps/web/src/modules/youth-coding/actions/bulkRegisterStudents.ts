"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { studentRegistrationSchema } from "../schema";
import { z } from "zod";

const bulkSchema = z.array(studentRegistrationSchema).min(1).max(500);

export async function bulkRegisterStudents(
  instructorId: string,
  departmentId: string,
  rows: unknown[],
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const parsed = bulkSchema.safeParse(rows);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let skipped = 0;

      for (const row of parsed.data) {
        const existing = await tx.student.findFirst({
          where: { name: row.name, instructorId, enrollmentStatus: "ACTIVE" },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await tx.student.create({
          data: {
            name: row.name,
            age: row.age,
            gender: row.gender,
            school: row.school,
            grade: row.grade,
            community: row.community,
            departmentId,
            instructorId,
            enrollmentStatus: "ACTIVE",
          },
        });
        created++;
      }

      return { created, skipped };
    });

    return { success: true, data: result };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err.message };
  }
}
