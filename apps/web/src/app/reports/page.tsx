import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAccessibleDepartmentIds } from "@orgos/utils";
import { prisma } from "@orgos/db";
import { ReportsClient } from "@/modules/report-generation/components/ReportsClient";

export default async function ReportsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const { role, departmentId, id: userId } = sessionUser;

  if (role === "INSTRUCTOR") {
    redirect(`/departments/${departmentId}/instructors/${userId}`);
  }

  const accessibleIds = await getAccessibleDepartmentIds(role, departmentId, prisma);

  const [dailyReports, weeklyReports, monthlyReports] = await Promise.all([
    accessibleIds.length > 0
      ? prisma.dailyReport.findMany({
          where: { departmentId: { in: accessibleIds } },
          orderBy: { date: "desc" },
          take: 30,
          select: {
            id: true,
            date: true,
            status: true,
            promptVersion: true,
            generatedContent: true,
            generatedMetrics: true,
            reviewedById: true,
            reviewedAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    accessibleIds.length > 0
      ? prisma.weeklyReport.findMany({
          where: { departmentId: { in: accessibleIds } },
          orderBy: { weekStart: "desc" },
          take: 26,
          select: {
            id: true,
            weekStart: true,
            weekEnd: true,
            status: true,
            promptVersion: true,
            generatedContent: true,
            generatedMetrics: true,
            reviewedById: true,
            reviewedAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    accessibleIds.length > 0
      ? prisma.monthlyReport.findMany({
          where: { departmentId: { in: accessibleIds } },
          orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
          take: 12,
          select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            status: true,
            promptVersion: true,
            generatedContent: true,
            generatedMetrics: true,
            reviewedById: true,
            reviewedAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return <ReportsClient dailyReports={dailyReports as never[]} weeklyReports={weeklyReports as never[]} monthlyReports={monthlyReports as never[]} />;
}