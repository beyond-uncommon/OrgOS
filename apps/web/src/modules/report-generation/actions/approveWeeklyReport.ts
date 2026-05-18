"use server";

import { approveReport } from "@orgos/report-generator";
import type { ActionResult } from "@orgos/utils";
import { requireSession } from "@/lib/auth/requireSession";

export async function approveWeeklyReport(
  reportId: string,
  edits?: Record<string, unknown>
): Promise<ActionResult<void>> {
  const sessionUser = await requireSession();
  return approveReport({ reportId, reportType: "weekly", reviewerId: sessionUser.id, ...(edits ? { edits } : {}) });
}
