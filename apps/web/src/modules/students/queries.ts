import { prisma, Role, Prisma } from "@orgos/db";

export type ProgramType = "youth-coding" | "bootcamp" | "teacher-training" | "outreach";
export type { StudentDetail };

interface ProgramDepartment {
  id: string;
  name: string;
  parentDepartmentId: string | null;
}

interface UnifiedStudent {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  school: string | null;
  community: string | null;
  grade: string | null;
  enrollmentStatus: string;
  createdAt: Date;
  department: {
    id: string;
    name: string;
  };
  instructor: {
    id: string;
    name: string;
  };
  sessionCount: number;
  reportCount: number;
  avgRating: number | null;
  youthCodingSessions: {
    id: string;
    date: Date;
    projectStatus: string;
    projectName: string;
  }[];
  linkedPrograms: string[];
  firstEnrollmentDate: Date | null;
  lastActivityDate: Date | null;
}

async function getProgramDepartments(): Promise<Record<ProgramType, string[]>> {
  const allDepts = await prisma.department.findMany({
    select: { id: true, name: true, parentDepartmentId: true },
  });

  const findProgramParent = (depts: ProgramDepartment[], name: string): string[] => {
    const parent = depts.find(d => d.name === name);
    if (!parent) return [];
    return depts
      .filter(d => d.parentDepartmentId === parent.id)
      .map(d => d.id);
  };

  return {
    "youth-coding": findProgramParent(allDepts, "Youth Coding Program"),
    bootcamp: findProgramParent(allDepts, "Bootcamp Program"),
    "teacher-training": findProgramParent(allDepts, "Teacher Training Program"),
    outreach: findProgramParent(allDepts, "Outreach Program"),
  };
}

export async function getUnifiedStudents(
  departmentIds?: string[],
  programFilter?: ProgramType[],
  statusFilter?: string[],
  searchName?: string
): Promise<UnifiedStudent[]> {
  const programDepts = await getProgramDepartments();

  const programDeptIds = programFilter
    ? programFilter.flatMap(p => programDepts[p] || [])
    : Object.values(programDepts).flat();

  const allowedDeptIds = departmentIds
    ? programDeptIds.filter(id => departmentIds.includes(id))
    : programDeptIds;

  if (allowedDeptIds.length === 0) {
    return [];
  }

  const where: Record<string, unknown> = {
    departmentId: { in: allowedDeptIds },
  };

  if (statusFilter && statusFilter.length > 0) {
    where.enrollmentStatus = { in: statusFilter };
  }

  if (searchName) {
    where.name = { contains: searchName, mode: "insensitive" };
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      department: { select: { id: true, name: true } },
      instructor: { select: { id: true, name: true } },
      sessionAttendance: {
        select: { id: true },
      },
      reports: {
        select: { rating: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const studentIds = students.map(s => s.id);

  const [sessionData, latestSessionDates, reportData] = await Promise.all([
    prisma.sessionAttendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, projectStatus: true, session: { select: { date: true } } },
    }),
    prisma.youthCodingSession.findMany({
      where: { attendance: { some: { studentId: { in: studentIds } } } },
      select: {
        id: true,
        date: true,
        attendance: { where: { studentId: { in: studentIds } }, select: { studentId: true } },
      },
    }),
    prisma.studentReport.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, rating: true },
    }),
  ]);

  const studentLinkedPrograms: Record<string, Set<string>> = {};
  for (const s of students) {
    const programs = new Set<string>();
    for (const [prog, deptIds] of Object.entries(programDepts)) {
      if (deptIds.includes(s.departmentId)) {
        programs.add(prog);
      }
    }
    studentLinkedPrograms[s.id] = programs;
  }

  return students.map(student => {
    const sessions = sessionData.filter(s => s.studentId === student.id);
    const reports = reportData.filter(r => r.studentId === student.id);
    const studentSessions = latestSessionDates
      .filter(s => s.attendance.some(a => a.studentId === student.id))
      .map(s => ({
        id: s.id,
        date: s.date,
        projectStatus: sessions.find(sess => sess.session.date.getTime() === s.date.getTime())?.projectStatus || "NOT_COMPLETE",
        projectName: "",
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    const avgRating = reports.length > 0
      ? Math.round((reports.reduce((sum, r) => sum + r.rating, 0) / reports.length) * 10) / 10
      : null;

    const lastSession = studentSessions[0];
    const lastActivity = lastSession?.date || student.updatedAt;

    return {
      id: student.id,
      name: student.name,
      age: student.age,
      gender: student.gender,
      school: student.school,
      community: student.community,
      grade: student.grade,
      enrollmentStatus: student.enrollmentStatus,
      createdAt: student.createdAt,
      department: student.department,
      instructor: student.instructor,
      sessionCount: sessions.length,
      reportCount: reports.length,
      avgRating,
      youthCodingSessions: studentSessions,
      linkedPrograms: Array.from(studentLinkedPrograms[student.id] || []),
      firstEnrollmentDate: student.firstEnrollmentDate || student.createdAt,
      lastActivityDate: student.lastActivityDate || lastActivity,
    };
  });
}

interface StudentDetail extends UnifiedStudent {
  allReports: {
    id: string;
    date: Date;
    rating: number;
    learned: string;
    enjoyed: string;
    struggled: string | null;
  }[];
  allSessions: {
    id: string;
    date: Date;
    projectStatus: string;
    projectName: string;
    instructor: { name: string };
  }[];
  dailyEntries: {
    id: string;
    date: Date;
    quickSummary: string;
    user: { name: string };
  }[];
}

export async function getStudentById(id: string, departmentIds?: string[]): Promise<StudentDetail | null> {
  const where: Record<string, unknown> = { id };
  if (departmentIds) where.departmentId = { in: departmentIds };

  const student = await prisma.student.findFirst({
    where,
    include: {
      department: { select: { id: true, name: true } },
      instructor: { select: { id: true, name: true } },
    },
  });

  if (!student) return null;

  const [allSessions, allReports, relatedEntries] = await Promise.all([
    prisma.sessionAttendance.findMany({
      where: { studentId: id },
      include: {
        session: {
          include: {
            submittedBy: { select: { name: true } },
          },
        },
      },
      orderBy: { session: { date: "desc" } },
    }),
    prisma.studentReport.findMany({
      where: { studentId: id },
      orderBy: { date: "desc" },
    }),
    prisma.dailyEntry.findMany({
      where: {
        OR: [
          { studentsInvolvedIds: { path: [], equals: id } },
          { dropoutStudentIds: { path: [], equals: id } },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 20,
    }),
  ]);

  const programDepts = await getProgramDepartments();
  const programs = new Set<string>();
  for (const [prog, deptIds] of Object.entries(programDepts)) {
    if (deptIds.includes(student.departmentId)) {
      programs.add(prog);
    }
  }

  const avgRating = allReports.length > 0
    ? Math.round((allReports.reduce((sum, r) => sum + r.rating, 0) / allReports.length) * 10) / 10
    : null;

  const sessions = allSessions.map(s => ({
    id: s.id,
    date: s.session.date,
    projectStatus: s.projectStatus,
    projectName: s.session.projectName,
    instructor: s.session.submittedBy,
  }));

  const lastSession = sessions[0];
  const lastActivity = lastSession?.date || student.updatedAt;

  return {
    id: student.id,
    name: student.name,
    age: student.age,
    gender: student.gender,
    school: student.school,
    community: student.community,
    grade: student.grade,
    enrollmentStatus: student.enrollmentStatus,
    createdAt: student.createdAt,
    department: student.department,
    instructor: student.instructor,
    sessionCount: allSessions.length,
    reportCount: allReports.length,
    avgRating,
    youthCodingSessions: sessions.slice(0, 5).map(s => ({
      id: s.id,
      date: s.date,
      projectStatus: s.projectStatus,
      projectName: s.projectName,
    })),
    linkedPrograms: Array.from(programs),
    firstEnrollmentDate: student.firstEnrollmentDate || student.createdAt,
    lastActivityDate: student.lastActivityDate || lastActivity,
    allReports: allReports.map(r => ({
      id: r.id,
      date: r.date,
      rating: r.rating,
      learned: r.learned,
      enjoyed: r.enjoyed,
      struggled: r.struggled,
    })),
    allSessions: sessions,
    dailyEntries: relatedEntries.map(e => ({
      id: e.id,
      date: e.date,
      quickSummary: e.quickSummary,
      user: e.user,
    })),
  };
}

export interface StudentStats {
  totalActive: number;
  byProgram: Record<string, number>;
  byStatus: Record<string, number>;
  averageAge: number;
  completionRate: number;
  dropoutRate: number;
}

export async function getStudentStats(departmentIds?: string[]): Promise<StudentStats> {
  const programDepts = await getProgramDepartments();
  const allProgramDeptIds = departmentIds
    ? Object.values(programDepts).flat().filter(id => departmentIds.includes(id))
    : Object.values(programDepts).flat();

  if (allProgramDeptIds.length === 0) {
    return {
      totalActive: 0,
      byProgram: {},
      byStatus: {},
      averageAge: 0,
      completionRate: 0,
      dropoutRate: 0,
    };
  }

  const [students, sessionsWithStatus] = await Promise.all([
    prisma.student.findMany({
      where: { departmentId: { in: allProgramDeptIds } },
      select: { enrollmentStatus: true, age: true, departmentId: true },
    }),
    prisma.sessionAttendance.findMany({
      where: { student: { departmentId: { in: allProgramDeptIds } } },
      select: { projectStatus: true },
    }),
  ]);

  const activeCount = students.filter(s => s.enrollmentStatus === "ACTIVE").length;
  const totalWithAge = students.filter(s => s.age !== null);
  const avgAge = totalWithAge.length > 0
    ? Math.round((totalWithAge.reduce((sum, s) => sum + (s.age || 0), 0) / totalWithAge.length) * 10) / 10
    : 0;

  const completeCount = sessionsWithStatus.filter(s => s.projectStatus === "COMPLETE").length;
  const completionRate = sessionsWithStatus.length > 0
    ? Math.round((completeCount / sessionsWithStatus.length) * 100)
    : 0;

  const dropoutCount = students.filter(s => s.enrollmentStatus === "DROPPED").length;
  const dropoutRate = students.length > 0
    ? Math.round((dropoutCount / students.length) * 100)
    : 0;

  const byProgram: Record<string, number> = {};
  for (const [prog, deptIds] of Object.entries(programDepts)) {
    byProgram[prog] = students.filter(s => deptIds.includes(s.departmentId)).length;
  }

  const byStatus: Record<string, number> = {};
  for (const s of students) {
    byStatus[s.enrollmentStatus] = (byStatus[s.enrollmentStatus] || 0) + 1;
  }

  return {
    totalActive: activeCount,
    byProgram,
    byStatus,
    averageAge: avgAge,
    completionRate,
    dropoutRate,
  };
}

export async function updateStudentStatus(id: string, status: string): Promise<void> {
  await prisma.student.update({
    where: { id },
    data: {
      enrollmentStatus: status,
      lastActivityDate: new Date(),
    },
  });
}

export async function addStudentNote(id: string, note: string): Promise<void> {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return;

  const history = (student.statusHistory as Array<{ date: string; status: string; program: string; note?: string }>) || [];
  history.push({
    date: new Date().toISOString(),
    status: student.enrollmentStatus,
    program: student.departmentId,
    note,
  });

  await prisma.student.update({
    where: { id },
    data: { statusHistory: history as unknown as Prisma.InputJsonValue },
  });
}