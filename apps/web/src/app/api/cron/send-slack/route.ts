import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { prisma, Role } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";
import { sendSlackWeeklyDigest, sendSlackAlert, sendSlackSubmissionReminder } from "@/lib/notifications/slack";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { type } = await request.json().catch(() => ({}));

  if (!process.env.SLACK_WEBHOOK_URL) {
    return NextResponse.json({ error: "SLACK_WEBHOOK_URL not configured" }, { status: 400 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  if (type === "weekly-digest" || type === "all") {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);

    const hubs = await prisma.department.findMany({
      where: { parentDepartmentId: { not: null } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    for (const hub of hubs) {
      const instructors = await prisma.user.findMany({
        where: { departmentId: hub.id, role: Role.INSTRUCTOR },
        select: { id: true },
      });

      const entries = await prisma.dailyEntry.findMany({
        where: {
          departmentId: hub.id,
          date: { gte: toDateOnly(weekStart), lte: toDateOnly(now) },
        },
        select: { userId: true },
      });

      const totalExpected = instructors.length * 7;
      const submissionRate = totalExpected > 0 ? Math.round((entries.length / totalExpected) * 100) : 0;

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
        select: { metadata: true },
        orderBy: { createdAt: "desc" },
      });
      const topIssue = topAlert?.metadata && typeof topAlert.metadata === "object"
        ? ((topAlert.metadata as Record<string, unknown>).description as string | undefined) ?? "No major issues"
        : "No major issues";

      const result = await sendSlackWeeklyDigest({
        hubName: hub.name,
        submissionRate,
        alertCount: activeAlerts,
        topIssue,
        departmentId: hub.id,
      });

      if (result.success) {
        results.push(`[${hub.name}] digest sent`);
      } else {
        errors.push(`[${hub.name}] failed: ${result.error}`);
      }
    }
  }

  if (type === "test-alert" || type === "all") {
    const testAlerts = [
      { hubName: "Youth Coding Program — Dzivarasekwa", alertType: "ENGAGEMENT_LOW", severity: "HIGH", description: "Afternoon engagement consistently low this week." },
      { hubName: "Design Bootcamp — Hub 1", alertType: "ATTENDANCE_GAP", severity: "MEDIUM", description: "Attendance dropped 20% over the past 3 days." },
    ];
    for (const a of testAlerts) {
      const result = await sendSlackAlert({ ...a, departmentId: "mock" });
      if (result.success) results.push(`[alert] sent to ${a.hubName}`);
      else errors.push(`[alert] failed: ${result.error}`);
    }
  }

  if (type === "reminder" || type === "all") {
    const instructors = await prisma.user.findMany({
      where: { role: Role.INSTRUCTOR },
      select: { id: true, name: true, email: true, departmentId: true },
      take: 10,
    });
    for (const inst of instructors) {
      if (!inst.departmentId) continue;
      const dept = await prisma.department.findUnique({ where: { id: inst.departmentId }, select: { name: true } });
      if (!dept) continue;
      const result = await sendSlackSubmissionReminder({
        instructorName: inst.name,
        hubName: dept.name,
        departmentId: inst.departmentId,
      });
      if (result.success) results.push(`[reminder] sent to ${inst.name}`);
      else errors.push(`[reminder] failed for ${inst.name}`);
    }
  }

  return NextResponse.json({ ok: errors.length === 0, results, errors: errors.length > 0 ? errors : undefined });
}