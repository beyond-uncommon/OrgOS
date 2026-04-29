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
