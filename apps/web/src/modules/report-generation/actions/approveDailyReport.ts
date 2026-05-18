"use server";

import { prisma, ReportStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function approveDailyReport(
  reportId: string,
): Promise<ActionResult<void>> {
  const sessionUser = await requireSession();

  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) return { success: false, error: "Daily report not found." };
  if (report.status === ReportStatus.APPROVED) {
    return { success: false, error: "Report is already approved." };
  }

  const editLog = Array.isArray(report.editLog) ? report.editLog : [];

  await prisma.dailyReport.update({
    where: { id: reportId },
    data: {
      status: ReportStatus.APPROVED,
      reviewedById: sessionUser.id,
      reviewedAt: new Date(),
      editLog,
    },
  });

  return { success: true, data: undefined };
}