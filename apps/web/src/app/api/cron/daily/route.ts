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
  const now = new Date();

  try {
    const { prisma } = await import("@orgos/db");
    const departments = await prisma.department.findMany({ select: { id: true } });

    for (const dept of departments) {
      try {
        const { generateDailyReport } = await import("@orgos/report-generator");
        await withRetry(
          async () => {
            const result = await generateDailyReport(dept.id, now);
            if (!result.success &&
              !result.error?.includes("already exists") &&
              !result.error?.includes("No daily entries")) {
              throw new Error(result.error);
            }
            return result;
          },
          { label: `daily_report:${dept.id}`, maxRetries: 2, baseDelayMs: 3000 }
        );
        results.push(`daily_report:${dept.id}:ok`);
      } catch (err) {
        errors.push(`daily_report:${dept.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`daily_report step failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const { runEndOfDayChecks } = await import("@orgos/anomaly-detection");
    await runEndOfDayChecks(now);
    results.push(`anomaly_checks:ok for ${now.toISOString().slice(0, 10)}`);
  } catch (err) {
    errors.push(`anomaly_checks failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const { prisma, EntryStatus } = await import("@orgos/db");
    const pendingEntries = await prisma.dailyEntry.findMany({
      where: {
        OR: [
          { status: EntryStatus.SUBMITTED },
          { status: EntryStatus.FLAGGED },
        ],
      },
      select: { id: true },
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
    const { prisma } = await import("@orgos/db");
    const { refreshDepartmentSnapshot } = await import("@orgos/dashboard-engine");
    const departments = await prisma.department.findMany({ select: { id: true } });

    for (const dept of departments) {
      try {
        await refreshDepartmentSnapshot(dept.id, now);
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