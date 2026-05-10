import { prisma, Role } from "@orgos/db";

export async function getInstructorProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
}

export async function getInstructorDailyEntries(userId: string, days = 14) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  return prisma.dailyEntry.findMany({
    where: { userId, date: { gte: from } },
    include: {
      extractedMetrics: {
        select: { metricKey: true, metricValue: true, flagged: true },
      },
      editRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, note: true, reviewNote: true, createdAt: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getInstructorAlerts(userId: string) {
  return prisma.alert.findMany({
    where: {
      resolved: false,
      entry: { userId },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentsForInstructor(instructorId: string) {
  return prisma.student.findMany({
    where: { instructorId, enrollmentStatus: "ACTIVE" },
    select: { id: true, name: true, enrollmentStatus: true },
    orderBy: { name: "asc" },
  });
}

export async function getDepartmentInstructors(departmentId: string) {
  return prisma.user.findMany({
    where: { departmentId, role: Role.INSTRUCTOR },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function getStudentReportsForInstructor(instructorId: string, days = 7) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  return prisma.studentReport.findMany({
    where: {
      student: { instructorId },
      date: { gte: from },
    },
    include: {
      student: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getYCSessionsForInstructor(instructorId: string, days = 7) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const sessions = await prisma.youthCodingSession.findMany({
    where: { date: { gte: from } },
    include: {
      attendance: {
        include: {
          student: { select: { id: true, name: true } },
        },
      },
      submittedBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return sessions.filter((s) => {
    const ids = s.instructorIds as string[] | null;
    return ids?.includes(instructorId) ?? false;
  });
}
