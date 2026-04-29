import { prisma, ReportStatus } from "@orgos/db";

export async function getWeeklyReportsByDepartment(departmentId: string, limit = 12) {
  return prisma.weeklyReport.findMany({
    where: { departmentId },
    orderBy: { weekStart: "desc" },
    take: limit,
  });
}

export async function getPendingWeeklyReviews(departmentId: string) {
  return prisma.weeklyReport.findMany({
    where: { departmentId, status: ReportStatus.DRAFT },
    orderBy: { weekStart: "asc" },
  });
}

export async function getMonthlyReportsByDepartment(departmentId: string, limit = 12) {
  return prisma.monthlyReport.findMany({
    where: { departmentId },
    orderBy: { periodYear: "desc" },
    take: limit,
  });
}
