import { prisma, SnapshotScope, PeriodType } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";
import type { ActionResult } from "@orgos/utils";

export async function refreshDepartmentSnapshot(
  departmentId: string,
  date: Date
): Promise<ActionResult<void>> {
  const periodStart = toDateOnly(date);

  // Aggregate metrics for all entries in the department on this date
  const metrics = await prisma.extractedMetric.findMany({
    where: { entry: { departmentId, date: periodStart } },
  });

  const aggregated: Record<string, unknown[]> = {};
  for (const m of metrics) {
    if (!aggregated[m.metricKey]) aggregated[m.metricKey] = [];
    aggregated[m.metricKey]!.push(m.metricValue);
  }

  const existing = await prisma.dashboardSnapshot.findFirst({
    where: { departmentId, periodType: PeriodType.DAILY, periodStart },
    select: { id: true },
  });

  if (existing) {
    await prisma.dashboardSnapshot.update({
      where: { id: existing.id },
      data: { data: aggregated as object },
    });
  } else {
    await prisma.dashboardSnapshot.create({
      data: {
        departmentId,
        scope: SnapshotScope.DEPARTMENT,
        periodType: PeriodType.DAILY,
        periodStart,
        data: aggregated as object,
      },
    });
  }

  return { success: true, data: undefined };
}
