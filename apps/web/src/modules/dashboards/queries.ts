import { prisma, SnapshotScope, PeriodType } from "@orgos/db";

export async function getDepartmentDashboard(departmentId: string) {
  return prisma.dashboardSnapshot.findFirst({
    where: {
      departmentId,
      scope: SnapshotScope.DEPARTMENT,
      periodType: PeriodType.DAILY,
    },
    orderBy: { periodStart: "desc" },
  });
}

export async function getRecentAlerts(departmentId: string, limit = 10) {
  return prisma.alert.findMany({
    where: {
      resolved: false,
      entry: { departmentId },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getWeeklyInsightSnapshot(departmentId: string) {
  return prisma.dashboardSnapshot.findFirst({
    where: {
      departmentId,
      scope: SnapshotScope.DEPARTMENT,
      periodType: PeriodType.WEEKLY,
    },
    orderBy: { periodStart: "desc" },
  });
}
