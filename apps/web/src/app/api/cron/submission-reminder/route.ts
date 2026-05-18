import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { prisma } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";
import { sendBulkSubmissionReminder } from "@/lib/email/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const now = new Date();
  const today = toDateOnly(now);
  const reminders: Array<{ name: string; email: string; departmentName: string }> = [];

  const departments = await prisma.department.findMany({
    where: { parentId: { isNot: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  for (const dept of departments) {
    const instructors = await prisma.user.findMany({
      where: { departmentId: dept.id, role: "INSTRUCTOR" },
      select: { id: true, name: true, email: true },
    });

    const submittedIds = new Set(
      (
        await prisma.dailyEntry.findMany({
          where: { departmentId: dept.id, date: today, user: { role: "INSTRUCTOR" } },
          select: { userId: true },
        })
      ).map(e => e.userId)
    );

    for (const inst of instructors) {
      if (!submittedIds.has(inst.id)) {
        reminders.push({ name: inst.name, email: inst.email, departmentName: dept.name });
      }
    }
  }

  const result = reminders.length > 0
    ? await sendBulkSubmissionReminder(reminders)
    : { sent: 0, failed: 0, errors: [] };

  return NextResponse.json({
    ok: true,
    results: [
      `submission_reminder:sent ${result.sent} email(s)`,
      `submission_reminder:failed ${result.failed}`,
      `submission_reminder:pending ${reminders.length}`,
      ...(result.errors.length ? result.errors.map((e, i) => `submission_reminder:error:${i} ${e}`) : []),
    ],
  });
}