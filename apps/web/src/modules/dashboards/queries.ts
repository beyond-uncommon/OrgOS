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

export async function getDepartmentDailyReports(departmentId: string, days = 7) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const entries = await prisma.dailyEntry.findMany({
    where: {
      departmentId,
      date: { gte: from },
      user: { role: "INSTRUCTOR" },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      extractedMetrics: {
        select: { metricKey: true, metricValue: true },
      },
    },
    orderBy: { date: "desc" },
  });

  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const group = grouped.get(entry.userId);
    if (!group) {
      grouped.set(entry.userId, [entry]);
    } else {
      group.push(entry);
    }
  }

  return grouped;
}
