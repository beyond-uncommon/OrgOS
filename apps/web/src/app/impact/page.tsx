import { prisma } from "@orgos/db";
import { ImpactClient } from "./ImpactClient";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function ImpactPage() {
  const org = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true },
  });
  if (!org) return null;

  const programs = await prisma.department.findMany({
    where: { parentDepartmentId: org.id },
    select: { id: true, name: true },
  });

  const programIds = programs.map(p => p.id);
  const bootcamps = await prisma.department.findMany({
    where: { parentDepartmentId: { in: programIds } },
    select: { id: true, name: true },
  });
  const bootcampIds = bootcamps.map(b => b.id);

  // All hub-level departments (children of programs like YC, or children of bootcamps)
  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: { in: [...programIds, ...bootcampIds] } },
    select: { id: true, name: true, parentDepartmentId: true },
  });
  const hubIds = hubs.map(h => h.id);

  const [totalStudents, fundingRecords, overallGender, overallSchools, overallCommunities] = await Promise.all([
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE" } }),
    prisma.fundingRecord.findMany({ orderBy: { receivedAt: "asc" } }),
    prisma.student.groupBy({ by: ["gender"], where: { enrollmentStatus: "ACTIVE", gender: { not: null } }, _count: true }),
    prisma.student.findMany({ where: { school: { not: null }, enrollmentStatus: "ACTIVE" }, select: { school: true }, distinct: ["school"] }),
    prisma.student.findMany({ where: { community: { not: null }, enrollmentStatus: "ACTIVE" }, select: { community: true }, distinct: ["community"] }),
  ]);

  const totalFunding = fundingRecords.reduce((s, r) => s + r.amount, 0);

  // ── Trend data ─────────────────────────────────────────
  const today = new Date();
  const thisYearStart = new Date(today.getFullYear(), 0, 1);
  const prevYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const prevYearEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  const prevFunding = fundingRecords
    .filter(r => r.receivedAt >= prevYearStart && r.receivedAt <= prevYearEnd)
    .reduce((s, r) => s + r.amount, 0);

  // ── Youth Coding data ──────────────────────────────────
  const ycProgram = programs.find(p => p.name.toLowerCase().includes("youth coding"));
  const ycHubs = ycProgram ? hubs.filter(h => h.parentDepartmentId === ycProgram.id) : [];
  const ycHubIds = ycHubs.map(h => h.id);
  const [ycStudents, ycGender, ycSchools, ycCommunities, ycSessions, ycAttendance] = await Promise.all([
    ycProgram
      ? prisma.student.count({ where: { enrollmentStatus: "ACTIVE", departmentId: { in: [...ycHubIds] } } })
      : Promise.resolve(0),
    ycProgram
      ? prisma.student.groupBy({ by: ["gender"], where: { enrollmentStatus: "ACTIVE", departmentId: { in: ycHubIds }, gender: { not: null } }, _count: true })
      : Promise.resolve([]),
    ycProgram
      ? prisma.student.findMany({ where: { school: { not: null }, enrollmentStatus: "ACTIVE", departmentId: { in: ycHubIds } }, select: { school: true }, distinct: ["school"] })
      : Promise.resolve([]),
    ycProgram
      ? prisma.student.findMany({ where: { community: { not: null }, enrollmentStatus: "ACTIVE", departmentId: { in: ycHubIds } }, select: { community: true }, distinct: ["community"] })
      : Promise.resolve([]),
    ycProgram
      ? prisma.youthCodingSession.count({ where: { departmentId: { in: ycHubIds }, date: { gte: new Date(new Date().getFullYear(), 0, 1) } } })
      : Promise.resolve(0),
    ycProgram
      ? prisma.sessionAttendance.findMany({ where: { session: { departmentId: { in: ycHubIds } } }, select: { projectStatus: true } })
      : Promise.resolve([]),
  ]);
  const ycCompletion = ycAttendance.length
    ? Math.round((ycAttendance.filter(a => a.projectStatus === "COMPLETE").length / ycAttendance.length) * 100)
    : 0;
  const ycAvgAge = ycStudents
    ? await prisma.student.aggregate({ where: { age: { not: null }, departmentId: { in: ycHubIds } }, _avg: { age: true } })
    : { _avg: { age: null } };

  // Monthly YC sessions for chart
  const rawYcSessions = ycProgram ? await prisma.youthCodingSession.findMany({
    where: { departmentId: { in: ycHubIds }, date: { gte: thisYearStart } },
    select: { date: true },
  }) : [];
  const ycSessionsByMonth = Array.from({ length: 12 }, () => 0);
  for (const s of rawYcSessions) {
    ycSessionsByMonth[s.date.getMonth()]!++;
  }

  // Previous YTD YC sessions for trend
  const prevYcSessions = ycProgram ? await prisma.youthCodingSession.count({
    where: { departmentId: { in: ycHubIds }, date: { gte: prevYearStart, lte: prevYearEnd } },
  }) : 0;

  // ── Bootcamp data ─────────────────────────────────────
  const bootcampProgram = programs.find(p => p.name.toLowerCase().includes("bootcamp"));
  const bootcampHubIds = hubs.filter(h => bootcampIds.includes(h.parentDepartmentId ?? "")).map(h => h.id);
  const [bootcampStudents, bootcampSnapshots] = await Promise.all([
    bootcampProgram
      ? prisma.student.count({ where: { enrollmentStatus: "ACTIVE", departmentId: { in: bootcampHubIds } } })
      : Promise.resolve(0),
    bootcampProgram
      ? prisma.dashboardSnapshot.findMany({ where: { departmentId: { in: bootcampHubIds }, periodType: "DAILY" }, orderBy: { periodStart: "desc" } })
      : Promise.resolve([]),
  ]);
  const latestSnap = new Map<string, typeof bootcampSnapshots[0]>();
  for (const s of bootcampSnapshots) {
    if (s.departmentId && !latestSnap.has(s.departmentId)) latestSnap.set(s.departmentId, s);
  }
  let bootcampAttSum = 0, bootcampAttHubs = 0;
  for (const snap of latestSnap.values()) {
    const d = snap.data as Record<string, unknown[]> | null;
    const rate = d?.attendance_rate;
    const v = Array.isArray(rate) ? rate.at(-1) : null;
    if (typeof v === "number") { bootcampAttSum += v; bootcampAttHubs++; }
  }
  const bootcampAvgAtt = bootcampAttHubs ? Math.round((bootcampAttSum / bootcampAttHubs) * 100) : null;

  // ── Per-program funding ────────────────────────────────
  const programFunding = Object.fromEntries(
    programs.map(p => [
      p.id,
      fundingRecords.filter(r => r.programId === p.id).reduce((s, r) => s + r.amount, 0),
    ]),
  );

  const ycTrend = prevYcSessions > 0 ? Math.round(((ycSessions - prevYcSessions) / prevYcSessions) * 100) : null;
  const fundingTrend = prevFunding > 0 ? Math.round(((totalFunding - prevFunding) / prevFunding) * 100) : null;
  const costPerStudent = totalFunding > 0 && totalStudents > 0 ? Math.round(totalFunding / totalStudents) : null;
  const completedStudents = ycProgram ? Math.round(ycStudents * (ycCompletion / 100)) : null;

  const todayStr = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const overview = {
    totalStudents,
    totalPrograms: programs.length,
    totalHubs: hubIds.length,
    totalFunding,
    fundingTrend,
    costPerStudent,
    overallGender: overallGender.filter((g): g is typeof g & { gender: string } => g.gender !== null).map(g => ({ gender: g.gender, count: g._count })),
    overallSchools: overallSchools.length,
    overallCommunities: overallCommunities.length,
    todayStr,
  };

  const ycData = ycProgram ? {
    name: ycProgram.name,
    students: ycStudents,
    hubs: ycHubs.length,
    schools: ycSchools.length,
    communities: ycCommunities.length,
    avgAge: ycAvgAge._avg.age ? Math.round(ycAvgAge._avg.age * 10) / 10 : null,
    sessions: ycSessions,
    sessionsTrend: ycTrend,
    sessionsByMonth: ycSessionsByMonth,
    completionRate: ycCompletion,
    completedStudents,
    gender: ycGender.filter((g): g is typeof g & { gender: string } => g.gender !== null).map(g => ({ gender: g.gender as string, count: g._count })),
    funding: programFunding[ycProgram.id] ?? 0,
  } : null;

  const bootcampData = bootcampProgram ? {
    name: bootcampProgram.name,
    students: bootcampStudents,
    bootcamps: bootcamps.length,
    hubs: bootcampHubIds.length,
    avgAttendance: bootcampAvgAtt,
    funding: programFunding[bootcampProgram.id] ?? 0,
  } : null;

  const teacherTraining = programs.find(p => p.name.toLowerCase().includes("teacher training"));
  const outreach = programs.find(p => p.name.toLowerCase().includes("outreach"));

  return (
    <ImpactClient
      overview={overview}
      ycData={ycData}
      bootcampData={bootcampData}
      teacherTrainingName={teacherTraining?.name ?? "Teacher Training"}
      teacherTrainingFunding={teacherTraining ? (programFunding[teacherTraining.id] ?? 0) : 0}
      outreachName={outreach?.name ?? "Outreach"}
      outreachFunding={outreach ? (programFunding[outreach.id] ?? 0) : 0}
    />
  );
}
