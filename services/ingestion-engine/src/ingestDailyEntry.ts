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
      ...fields,
    },
  });

  return { success: true, data: entry };
}
