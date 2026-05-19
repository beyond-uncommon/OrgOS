"use server";

import { prisma, ReportStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireAccess } from "@/lib/auth/requireAccess";

export async function approveDailyReport(
  reportId: string,
): Promise<ActionResult<void>> {
  const { user } = await requireAccess([
    "HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER",
    "COUNTRY_DIRECTOR", "ADMIN",
  ]);

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: { department: { select: { name: true } } },
  });
  if (!report) return { success: false, error: "Daily report not found." };
  if (report.status === ReportStatus.APPROVED) {
    return { success: false, error: "Report is already approved." };
  }

  const editLog = Array.isArray(report.editLog) ? report.editLog : [];

  await prisma.dailyReport.update({
    where: { id: reportId },
    data: {
      status: ReportStatus.APPROVED,
      reviewedById: user.id,
      reviewedAt: new Date(),
      editLog,
    },
  });

  try {
    const departmentHead = await prisma.user.findFirst({
      where: { departmentId: report.departmentId, role: "HUB_LEAD" },
      select: { email: true, name: true },
    });
    if (departmentHead) {
      const { sendReportApprovedNotification } = await import("@/lib/email/service");
      await sendReportApprovedNotification(
        departmentHead.email,
        departmentHead.name,
        "Daily",
        report.department?.name ?? "Unknown",
        report.date.toISOString().slice(0, 10),
      );
    }
  } catch {
    console.warn("[approveDailyReport] Email notification failed");
  }

  return { success: true, data: undefined };
}