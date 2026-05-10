import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { getDepartmentsWithInstructors } from "@/lib/cron/departments";

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

  const weekOf = new Date();

  for (const dept of departments) {
    // Weekly report (LLM-generated narrative)
    try {
      const { generateWeeklyReport } = await import("@orgos/report-generator");
      const reportResult = await generateWeeklyReport(dept.id, weekOf);
      if (reportResult.success) {
        results.push(`[${dept.name}] WeeklyReport created`);
      } else {
        results.push(`[${dept.name}] WeeklyReport skipped: ${reportResult.error}`);
      }
    } catch (err) {
      errors.push(`[${dept.name}] WeeklyReport failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Weekly insights (structured analysis → dashboard snapshot)
    try {
      const { generateWeeklyInsights } = await import("@orgos/insight-engine");
      const insightResult = await generateWeeklyInsights(dept.id, weekOf);
      if (insightResult.success) {
        results.push(`[${dept.name}] WeeklyInsights created`);
      } else {
        results.push(`[${dept.name}] WeeklyInsights skipped: ${insightResult.error}`);
      }
    } catch (err) {
      errors.push(`[${dept.name}] WeeklyInsights failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    departmentsProcessed: departments.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
