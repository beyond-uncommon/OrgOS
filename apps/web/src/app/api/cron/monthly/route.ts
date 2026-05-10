import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { getDepartmentsWithInstructors } from "@/lib/cron/departments";
import type { InsightReport } from "@orgos/shared-types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const departments = await getDepartmentsWithInstructors();
  const results: string[] = [];
  const errors: string[] = [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  for (const dept of departments) {
    // Monthly insights first (structured analysis → dashboard snapshot)
    let insightReport: InsightReport | undefined;
    try {
      const { generateMonthlyInsights } = await import("@orgos/insight-engine");
      const insightResult = await generateMonthlyInsights(dept.id, year, month);
      if (insightResult.success) {
        insightReport = insightResult.data;
        results.push(`[${dept.name}] MonthlyInsights created`);
      } else {
        results.push(`[${dept.name}] MonthlyInsights skipped: ${insightResult.error}`);
      }
    } catch (err) {
      errors.push(`[${dept.name}] MonthlyInsights failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Monthly report (LLM-generated narrative, enriched with insights if available)
    try {
      const { generateMonthlyReport } = await import("@orgos/report-generator");
      const reportResult = await generateMonthlyReport(dept.id, year, month, insightReport);
      if (reportResult.success) {
        results.push(`[${dept.name}] MonthlyReport created`);
      } else {
        results.push(`[${dept.name}] MonthlyReport skipped: ${reportResult.error}`);
      }
    } catch (err) {
      errors.push(`[${dept.name}] MonthlyReport failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Executive snapshot (org-level rollup)
  try {
    const { generateExecutiveSnapshot } = await import("@orgos/insight-engine");
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const execResult = await generateExecutiveSnapshot(monthStart, monthEnd);
    if (execResult.success) {
      results.push("ExecutiveSnapshot created");
    } else {
      results.push(`ExecutiveSnapshot skipped: ${execResult.error}`);
    }
  } catch (err) {
    errors.push(`ExecutiveSnapshot failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    departmentsProcessed: departments.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
