import { randomUUID } from "node:crypto";
import { prisma } from "@orgos/db";
import { toDateOnly, log, logError } from "@orgos/utils";
import { AnomalyEvents } from "../config/eventTypes.js";
import { detectMissingEntry } from "../detectors/detectMissingEntry.js";
import { createAlertsFromAnomalies } from "../factories/alertFactory.js";

export async function runEndOfDayChecks(date: Date): Promise<void> {
  const eodRunId = randomUUID();
  const checkDate = toDateOnly(date);
  const run = Object.freeze({ eodRunId, date: checkDate.toISOString(), logVersion: 1 });

  log(AnomalyEvents.EOD_TRIGGERED, run);

  const departments = await prisma.department.findMany({
    select: { id: true },
  });

  const settled = await Promise.allSettled(
    departments.map(async (dept) => {
      const [users, entries] = await Promise.all([
        prisma.user.findMany({
          where: { departmentId: dept.id },
          select: { id: true, departmentId: true },
        }),
        prisma.dailyEntry.findMany({
          where: { departmentId: dept.id, date: checkDate },
          select: { userId: true },
        }),
      ]);

      const submittedIds = new Set(entries.map((e) => e.userId));
      const usersWithoutEntry = await Promise.all(
        users
          .filter((u) => !submittedIds.has(u.id))
          .map(async (u) => {
            const consecutiveDays = await countConsecutiveMissingDays(u.id, checkDate);
            return { id: u.id, departmentId: dept.id, consecutiveMissingDays: consecutiveDays };
          })
      );

      if (usersWithoutEntry.length === 0) return;

      const anomalies = detectMissingEntry({ date: checkDate, departmentId: dept.id, usersWithoutEntry });
      await createAlertsFromAnomalies(anomalies);

      log(AnomalyEvents.EOD_DEPARTMENT_COMPLETE, {
        ...run,
        departmentId: dept.id,
        missingCount: usersWithoutEntry.length,
      });
    })
  );

  const failed = settled.filter((r) => r.status === "rejected");
  for (const result of failed) {
    logError(AnomalyEvents.EOD_DEPARTMENT_FAILED, (result as PromiseRejectedResult).reason, run);
  }

  log(AnomalyEvents.EOD_COMPLETED, {
    ...run,
    departmentsChecked: departments.length,
    departmentsFailed: failed.length,
  });
}

async function countConsecutiveMissingDays(userId: string, upToDate: Date): Promise<number> {
  let count = 0;
  const cursor = new Date(upToDate);

  for (let i = 0; i < 7; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const entry = await prisma.dailyEntry.findFirst({
      where: { userId, date: toDateOnly(cursor) },
      select: { id: true },
    });
    if (!entry) {
      count++;
    } else {
      break;
    }
  }

  return count + 1; // +1 for today
}
