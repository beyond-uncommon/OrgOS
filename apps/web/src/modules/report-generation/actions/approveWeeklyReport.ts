"use server";

import { approveReport } from "@orgos/report-generator";
import type { ActionResult } from "@orgos/utils";

export async function approveWeeklyReport(
  reportId: string,
  reviewerId: string,
  edits?: Record<string, unknown>
): Promise<ActionResult<void>> {
  return approveReport({ reportId, reportType: "weekly", reviewerId, ...(edits ? { edits } : {}) });
}
