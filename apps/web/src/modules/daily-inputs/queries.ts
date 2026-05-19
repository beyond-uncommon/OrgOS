import { prisma } from "@orgos/db";

export async function getDailyEntriesForUser(userId: string, limit = 30) {
  return prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export async function getDailyEntriesForDepartment(
  departmentId: string,
  from: Date,
  to: Date
) {
  return prisma.dailyEntry.findMany({
    where: { departmentId, date: { gte: from, lte: to } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });
}

export async function getDailyEntryByUserAndDate(userId: string, date: Date) {
  return prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date } },
  });
}

export async function getPreviousEntry(userId: string, beforeDate: Date) {
  return prisma.dailyEntry.findFirst({
    where: { userId, date: { lt: beforeDate } },
    orderBy: { date: "desc" },
    include: {
      extractedMetrics: { select: { metricKey: true, metricValue: true } },
    },
  });
}

export async function getUserWeekSummary(userId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const entries = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: weekStart } },
    orderBy: { date: "asc" },
    include: { extractedMetrics: { select: { metricKey: true, metricValue: true } } },
  });

  if (entries.length === 0) return null;

  const metrics = entries.flatMap(e => e.extractedMetrics);
  const metricCounts = new Map<string, number>();
  for (const m of metrics) {
    metricCounts.set(m.metricKey, (metricCounts.get(m.metricKey) ?? 0) + 1);
  }

  return {
    entriesThisWeek: entries.length,
    daysExpected: 7,
    daysSubmitted: entries.length,
    datesSubmitted: entries.map(e => e.date.toISOString().slice(0, 10)),
    topMetrics: [...metricCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, count })),
  };
}
