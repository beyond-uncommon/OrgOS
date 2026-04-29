import { prisma, SnapshotScope, PeriodType } from "@orgos/db";
import type { DashboardSnapshot } from "@orgos/shared-types";

export async function getLatestSnapshot(
  departmentId: string,
  scope: SnapshotScope = SnapshotScope.DEPARTMENT,
  periodType: PeriodType = PeriodType.DAILY
): Promise<DashboardSnapshot | null> {
  return prisma.dashboardSnapshot.findFirst({
    where: { departmentId, scope, periodType },
    orderBy: { periodStart: "desc" },
  });
}
