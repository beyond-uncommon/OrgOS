import { prisma, Role } from "@orgos/db";

export async function getStudentsForUser(userId: string) {
  return prisma.student.findMany({
    where: { instructorId: userId, enrollmentStatus: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

export async function getSessionsForUser(userId: string) {
  return prisma.youthCodingSession.findMany({
    where: { submittedById: userId },
    include: {
      attendance: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getDepartmentUsersForSession(departmentId: string) {
  return prisma.user.findMany({
    where: { departmentId },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getYCHubSummary(departmentId: string) {
  const sessionsThisMonth = await prisma.youthCodingSession.findMany({
    where: {
      departmentId,
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    include: { attendance: true },
  });

  const uniqueStudents = await prisma.sessionAttendance.findMany({
    where: {
      session: {
        departmentId,
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const totalAttendance = sessionsThisMonth.flatMap(s => s.attendance);
  const completionRate =
    totalAttendance.length > 0
      ? Math.round(
          (totalAttendance.filter(a => a.projectStatus === "COMPLETE").length /
            totalAttendance.length) *
            100,
        )
      : 0;

  const schoolBreakdown = sessionsThisMonth.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.school] = (acc[s.school] ?? 0) + s.attendance.length;
      return acc;
    },
    {},
  );

  return {
    uniqueStudentCount: uniqueStudents.length,
    sessionsThisMonth: sessionsThisMonth.length,
    completionRate,
    schoolBreakdown,
  };
}

export async function getYCInstructorSummary(instructorId: string) {
  const studentUsers = await prisma.user.findMany({
    where: {
      department: {
        users: { some: { id: instructorId } },
      },
      role: Role.STUDENT,
    },
    select: { id: true },
  });

  const studentUserIds = studentUsers.map(u => u.id);

  const uniqueYouthStudents = await prisma.student.count({
    where: { instructorId: { in: studentUserIds }, enrollmentStatus: "ACTIVE" },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sessionsThisWeek = await prisma.youthCodingSession.count({
    where: {
      submittedById: { in: studentUserIds },
      date: { gte: weekAgo },
    },
  });

  const recentAttendance = await prisma.sessionAttendance.findMany({
    where: {
      session: {
        submittedById: { in: studentUserIds },
        date: { gte: weekAgo },
      },
    },
    select: { projectStatus: true },
  });

  const completionRate =
    recentAttendance.length > 0
      ? Math.round(
          (recentAttendance.filter(a => a.projectStatus === "COMPLETE").length /
            recentAttendance.length) *
            100,
        )
      : 0;

  return { uniqueYouthStudents, sessionCount: sessionsThisWeek, completionRate };
}

export async function getYCBootcampAggregate(hubDepartmentIds: string[]) {
  const uniqueStudents = await prisma.sessionAttendance.findMany({
    where: { session: { departmentId: { in: hubDepartmentIds } } },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const sessionsThisMonth = await prisma.youthCodingSession.count({
    where: {
      departmentId: { in: hubDepartmentIds },
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  return {
    uniqueStudentCount: uniqueStudents.length,
    sessionsThisMonth,
  };
}

export async function getYCOrgSummary(allHubDepartmentIds: string[]) {
  const [uniqueStudents, currentMonthSessions, genderBreakdown, schoolCount] =
    await Promise.all([
      prisma.sessionAttendance.findMany({
        where: { session: { departmentId: { in: allHubDepartmentIds } } },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      prisma.youthCodingSession.count({
        where: {
          departmentId: { in: allHubDepartmentIds },
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.student.groupBy({
        by: ["gender"],
        where: { enrollmentStatus: "ACTIVE", departmentId: { in: allHubDepartmentIds } },
        _count: true,
      }),
      prisma.youthCodingSession.findMany({
        where: { departmentId: { in: allHubDepartmentIds } },
        select: { school: true },
        distinct: ["school"],
      }),
    ]);

  return {
    totalUniqueStudents: uniqueStudents.length,
    sessionsThisMonth: currentMonthSessions,
    genderBreakdown: genderBreakdown.map(g => ({
      gender: g.gender,
      count: g._count,
    })),
    schoolCount: schoolCount.length,
  };
}

export async function getYCMasterList() {
  return prisma.student.findMany({
    where: { enrollmentStatus: "ACTIVE" },
    include: {
      department: { select: { id: true, name: true } },
      instructor: { select: { id: true, name: true } },
      sessionAttendance: {
        include: {
          session: { select: { id: true, date: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}
