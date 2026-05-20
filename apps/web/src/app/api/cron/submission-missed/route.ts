import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { prisma } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";
import { sendBulkMissedDeadline } from "@/lib/email/service";
import { sendSlackMissedDeadline } from "@/lib/notifications/slack";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const departments = await prisma.department.findMany({
    where: { parentDepartmentId: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const missing: Array<{
    name: string;
    email: string;
    departmentName: string;
    submissionCount: number;
    missedDays: number;
  }> = [];

  for (const dept of departments) {
    const instructors = await prisma.user.findMany({
      where: { departmentId: dept.id, role: "INSTRUCTOR" },
      select: { id: true, name: true, email: true },
    });

    const entries = await prisma.dailyEntry.findMany({
      where: {
        departmentId: dept.id,
        user: { role: "INSTRUCTOR" },
        date: { gte: toDateOnly(weekStart) },
      },
      select: { userId: true, date: true },
    });

    const submittedByUser = new Map<string, Set<string>>();
    for (const e of entries) {
      if (!submittedByUser.has(e.userId)) submittedByUser.set(e.userId, new Set());
      submittedByUser.get(e.userId)!.add(e.date.toISOString().slice(0, 10));
    }

    for (const inst of instructors) {
      const dates = submittedByUser.get(inst.id) ?? new Set();
      const expectedDays = getExpectedDays(weekStart, now);
      const missedDays = expectedDays.length - expectedDays.filter(d => dates.has(d)).length;

      if (missedDays > 0) {
        missing.push({
          name: inst.name,
          email: inst.email,
          departmentName: dept.name,
          submissionCount: dates.size,
          missedDays,
        });

        if (process.env.SLACK_WEBHOOK_URL && missedDays >= 2) {
          void sendSlackMissedDeadline({
            instructorName: inst.name,
            hubName: dept.name,
            missedDays,
            departmentId: dept.id,
          });
        }
      }
    }
  }

  const result = missing.length > 0
    ? await sendBulkMissedDeadline(missing)
    : { sent: 0, failed: 0, errors: [] };

  return NextResponse.json({
    ok: true,
    results: [
      `submission_missed:sent ${result.sent} email(s)`,
      `submission_missed:notified ${missing.length} instructor(s)`,
      process.env.SLACK_WEBHOOK_URL ? "submission_missed:slack_notified (2+ days)" : "submission_missed:slack_skipped (not configured)",
      ...(result.errors.length ? result.errors.map((e, i) => `submission_missed:error:${i} ${e}`) : []),
    ],
  });
}

function getExpectedDays(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}