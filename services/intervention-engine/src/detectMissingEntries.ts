import { prisma, AlertType, Severity } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";
import { createAlert } from "./createAlert.js";

export async function detectMissingEntries(
  departmentId: string,
  date: Date,
  autoAssignTo?: string
): Promise<void> {
  const entryDate = toDateOnly(date);

  const [users, entries] = await Promise.all([
    prisma.user.findMany({ where: { departmentId }, select: { id: true } }),
    prisma.dailyEntry.findMany({
      where: { departmentId, date: entryDate },
      select: { userId: true },
    }),
  ]);

  const submittedIds = new Set(entries.map((e) => e.userId));

  await Promise.allSettled(
    users
      .filter((u) => !submittedIds.has(u.id))
      .map((u) =>
        createAlert({
          type: AlertType.MISSING_ENTRY,
          severity: Severity.MEDIUM,
          ...(autoAssignTo ? { autoAssignTo } : {}),
        })
      )
  );
}
