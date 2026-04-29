import { prisma, ReportStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";

type ReportType = "weekly" | "monthly";

interface ApproveInput {
  reportId: string;
  reportType: ReportType;
  reviewerId: string;
  edits?: Record<string, unknown>; // optional edits applied during review
}

export async function approveReport(
  input: ApproveInput
): Promise<ActionResult<void>> {
  const { reportId, reportType, reviewerId, edits } = input;

  if (reportType === "weekly") {
    const report = await prisma.weeklyReport.findUnique({ where: { id: reportId } });
    if (!report) return { success: false, error: "Weekly report not found." };
    if (report.status === ReportStatus.APPROVED) {
      return { success: false, error: "Report is already approved." };
    }

    const editLog = Array.isArray(report.editLog) ? report.editLog : [];
    if (edits) {
      (editLog as object[]).push({ reviewerId, edits, at: new Date().toISOString() });
    }

    await prisma.weeklyReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        editLog,
      },
    });
  } else {
    const report = await prisma.monthlyReport.findUnique({ where: { id: reportId } });
    if (!report) return { success: false, error: "Monthly report not found." };
    if (report.status === ReportStatus.APPROVED) {
      return { success: false, error: "Report is already approved." };
    }

    const editLog = Array.isArray(report.editLog) ? report.editLog : [];
    if (edits) {
      (editLog as object[]).push({ reviewerId, edits, at: new Date().toISOString() });
    }

    await prisma.monthlyReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        editLog,
      },
    });
  }

  return { success: true, data: undefined };
}
