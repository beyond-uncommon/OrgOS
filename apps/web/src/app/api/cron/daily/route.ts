import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { logError, withRetry } from "@orgos/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  try {
    // ── Step 1: End-of-day anomaly checks ──────────────────────────────────
    // Detects missing entries per department, creates Alert records.
    const { runEndOfDayChecks } = await import("@orgos/anomaly-detection");
    const date = new Date();
    await runEndOfDayChecks(date);
    results.push(`anomaly_checks:ok for ${date.toISOString().slice(0, 10)}`);
  } catch (err) {
    errors.push(`anomaly_checks failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    // ── Step 2: Process all COMPLETE entries that haven't been extracted ────
    // Re-processes SUBMITTED entries that were flagged as failed in the pipeline.
    // This is idempotent — safe to run daily.
    const { prisma, EntryStatus } = await import("@orgos/db");
    const pendingEntries = await prisma.dailyEntry.findMany({
      where: {
        OR: [
          { status: EntryStatus.SUBMITTED },
          { status: EntryStatus.FLAGGED },
        ],
      },
      select: { id: true, date: true, departmentId: true },
    });

    results.push(`entries_to_process:${pendingEntries.length}`);

    for (const entry of pendingEntries) {
      try {
        const { extractMetrics } = await import("@orgos/metric-extraction");
        await withRetry(
          async () => {
            const fullEntry = await prisma.dailyEntry.findUnique({ where: { id: entry.id } });
            if (!fullEntry) throw new Error("Entry not found");
            const result = await extractMetrics(fullEntry as never);
            if (!result.success) throw new Error(result.error);
            return result;
          },
          { label: `extractMetrics:${entry.id}`, maxRetries: 3, baseDelayMs: 2000 }
        );
      } catch (err) {
        errors.push(`extract_failed:${entry.id} ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    results.push(`metric_extraction:processed ${pendingEntries.length} entries`);
  } catch (err) {
    errors.push(`metric_extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    // ── Step 3: Generate weekly reports for departments that need one ────────
    const { prisma } = await import("@orgos/db");
    const departments = await prisma.department.findMany({ select: { id: true } });

    for (const dept of departments) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      // Generate weekly report on Sunday (day 0) — week just completed
      if (dayOfWeek === 0) {
        try {
          const { generateWeeklyReport } = await import("@orgos/report-generator");
          await withRetry(
            async () => {
              const lastSunday = new Date(now);
              lastSunday.setDate(now.getDate() - 7);
              lastSunday.setHours(0, 0, 0, 0);
              const result = await generateWeeklyReport(dept.id, lastSunday);
              if (!result.success && !result.error?.includes("already exists")) {
                throw new Error(result.error);
              }
              return result;
            },
            { label: `weekly_report:${dept.id}`, maxRetries: 2, baseDelayMs: 5000 }
          );
          results.push(`weekly_report:${dept.id}:ok`);
        } catch (err) {
          errors.push(`weekly_report:${dept.id} failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    results.push("weekly_reports:completed");
  } catch (err) {
    errors.push(`weekly_reports failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    // ── Step 4: Generate monthly report on the 1st of each month ────────────
    const now = new Date();
    if (now.getDate() === 1) {
      const { prisma } = await import("@orgos/db");
      const departments = await prisma.department.findMany({ select: { id: true } });

      for (const dept of departments) {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        try {
          const { generateMonthlyReport } = await import("@orgos/report-generator");
          await withRetry(
            async () => {
              const result = await generateMonthlyReport(dept.id, lastMonth.getFullYear(), lastMonth.getMonth() + 1);
              if (!result.success && !result.error?.includes("already exists")) {
                throw new Error(result.error);
              }
              return result;
            },
            { label: `monthly_report:${dept.id}`, maxRetries: 2, baseDelayMs: 5000 }
          );
          results.push(`monthly_report:${dept.id}:ok`);
        } catch (err) {
          errors.push(`monthly_report:${dept.id} failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      results.push("monthly_reports:completed");
    }
  } catch (err) {
    errors.push(`monthly_reports failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    // ── Step 5: Refresh dashboard snapshots for all active departments ──────
    const { prisma } = await import("@orgos/db");
    const departments = await prisma.department.findMany({ select: { id: true } });

    for (const dept of departments) {
      try {
        const { refreshDepartmentSnapshot } = await import("@orgos/dashboard-engine");
        await refreshDepartmentSnapshot(dept.id, new Date());
      } catch (err) {
        errors.push(`snapshot:${dept.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    results.push("dashboard_snapshots:refreshed");
  } catch (err) {
    errors.push(`dashboard_snapshots failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}