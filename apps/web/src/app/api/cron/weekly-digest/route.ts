import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { prisma, Role } from "@orgos/db";
import { toDateOnly, logError } from "@orgos/utils";
import { sendSlackWeeklyDigest } from "@/lib/notifications/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);

  const results: string[] = [];
  const errors: string[] = [];

  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  for (const hub of hubs) {
    try {
      const instructors = await prisma.user.findMany({
        where: { departmentId: hub.id, role: Role.INSTRUCTOR },
        select: { id: true, name: true, email: true },
      });

      const entries = await prisma.dailyEntry.findMany({
        where: {
          departmentId: hub.id,
          date: { gte: toDateOnly(weekStart), lte: toDateOnly(now) },
        },
        select: { userId: true, date: true },
      });

      const submittedDates = new Map<string, Set<string>>();
      for (const e of entries) {
        if (!submittedDates.has(e.userId)) submittedDates.set(e.userId, new Set());
        submittedDates.get(e.userId)!.add(e.date.toISOString().slice(0, 10));
      }

      const totalExpected = instructors.length * 7;
      const totalSubmitted = entries.length;
      const submissionRate = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

      const activeAlerts = await prisma.alert.count({
        where: {
          entry: { departmentId: hub.id },
          createdAt: { gte: toDateOnly(weekStart), lte: toDateOnly(now) },
          resolved: false,
        },
      });

      const topAlert = await prisma.alert.findFirst({
        where: {
          entry: { departmentId: hub.id },
          createdAt: { gte: toDateOnly(weekStart), lte: toDateOnly(now) },
        },
        select: { type: true, metadata: true },
        orderBy: { createdAt: "desc" },
      });
      const topIssue = topAlert?.metadata && typeof topAlert.metadata === "object"
        ? ((topAlert.metadata as Record<string, unknown>).description as string | undefined) ?? "No major issues"
        : "No major issues";

      if (!process.env.SLACK_WEBHOOK_URL) {
        results.push(`[${hub.name}] skipped — SLACK_WEBHOOK_URL not configured`);
        continue;
      }

      const result = await sendSlackWeeklyDigest({
        hubName: hub.name,
        submissionRate,
        alertCount: activeAlerts,
        topIssue: topIssue,
        departmentId: hub.id,
      });

      if (result.success) {
        results.push(`[${hub.name}] sent (${submissionRate}% submission, ${activeAlerts} alerts)`);
      } else {
        errors.push(`[${hub.name}] Slack failed: ${result.error}`);
      }
    } catch (err) {
      logError("weekly-digest", err, { hubId: hub.id });
      errors.push(`[${hub.name}] failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    hubsProcessed: hubs.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}