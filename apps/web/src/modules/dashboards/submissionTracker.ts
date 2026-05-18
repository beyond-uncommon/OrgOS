import { prisma } from "@orgos/db";
import { toDateOnly } from "@orgos/utils";

export interface InstructorSubmissionStatus {
  userId: string;
  userName: string;
  userEmail: string;
  submitted: boolean;
  submittedAt?: Date;
  entryId?: string;
}

export async function getTodaySubmissionStatus(departmentId: string) {
  const today = toDateOnly(new Date());
  const instructors = await prisma.user.findMany({
    where: { departmentId, role: "INSTRUCTOR" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const todayEntries = await prisma.dailyEntry.findMany({
    where: { departmentId, date: today, user: { role: "INSTRUCTOR" } },
    select: { id: true, userId: true, createdAt: true },
  });

  const submittedIds = new Set(todayEntries.map(e => e.userId));
  const byUser = new Map(todayEntries.map(e => [e.userId, e]));

  const statuses: InstructorSubmissionStatus[] = instructors.map(inst => {
    const entry = byUser.get(inst.id);
    const base = {
      userId: inst.id,
      userName: inst.name,
      userEmail: inst.email,
      submitted: submittedIds.has(inst.id),
    };
    return entry
      ? { ...base, submittedAt: entry.createdAt, entryId: entry.id }
      : base;
  });

  const submitted = statuses.filter(s => s.submitted).length;
  const missing = statuses.filter(s => !s.submitted);
  const completionRate = instructors.length > 0 ? Math.round((submitted / instructors.length) * 100) : 0;

  return { statuses, submitted, total: instructors.length, completionRate, missing };
}

export async function getTodaySubmissionStatusOrgWide() {
  const departments = await prisma.department.findMany({
    where: { parentDepartmentId: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results = await Promise.all(
    departments.map(async (dept) => {
      const { submitted, total, completionRate, missing } = await getTodaySubmissionStatus(dept.id);
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        submitted,
        total,
        completionRate,
        missingCount: missing.length,
        missingInstructors: missing.map(m => ({ name: m.userName, email: m.userEmail })),
      };
    })
  );

  const totalInstructors = results.reduce((sum, r) => sum + r.total, 0);
  const totalSubmitted = results.reduce((sum, r) => sum + r.submitted, 0);
  const overallRate = totalInstructors > 0 ? Math.round((totalSubmitted / totalInstructors) * 100) : 0;

  return { departments: results, totalInstructors, totalSubmitted, overallRate };
}