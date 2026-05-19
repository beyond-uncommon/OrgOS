import { prisma, Role, PeriodType } from "@orgos/db";
import { getYCManagerMetrics } from "@/modules/youth-coding/queries";
import { getWeeklyReportsByDepartment } from "@/modules/report-generation/queries";

export type ProgramType = "YOUTH_CODING" | "BOOTCAMP" | "OUTREACH" | "TEACHER_TRAINING" | "UNKNOWN";

export function detectProgramType(name: string): ProgramType {
  const n = name.toLowerCase();
  if (n.includes("youth coding")) return "YOUTH_CODING";
  if (n.includes("bootcamp")) return "BOOTCAMP";
  if (n.includes("outreach")) return "OUTREACH";
  if (n.includes("teacher training")) return "TEACHER_TRAINING";
  return "UNKNOWN";
}

export async function getProgramDashboardData(programDepartmentId: string) {
  const bootcamps = await prisma.department.findMany({
    where: { parentDepartmentId: programDepartmentId },
    select: { id: true, name: true },
  });
  const bootcampIds = bootcamps.map((b) => b.id);

  const allHubRows = await prisma.department.findMany({
    where: { parentDepartmentId: { in: bootcampIds } },
    select: { id: true, name: true, parentDepartmentId: true },
  });
  const hubsByBootcamp = new Map<string, { id: string; name: string }[]>();
  for (const hub of allHubRows) {
    if (!hub.parentDepartmentId) continue;
    const list = hubsByBootcamp.get(hub.parentDepartmentId) ?? [];
    list.push({ id: hub.id, name: hub.name });
    hubsByBootcamp.set(hub.parentDepartmentId, list);
  }

  const allHubIds = [...hubsByBootcamp.values()].flat().map((h) => h.id);

  const [bootcampManagers, snapshots, alerts] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: bootcampIds }, role: Role.BOOTCAMP_MANAGER },
      select: { departmentId: true, name: true },
    }),
    prisma.dashboardSnapshot.findMany({
      where: { departmentId: { in: allHubIds }, periodType: PeriodType.DAILY },
      orderBy: { periodStart: "desc" },
    }),
    prisma.alert.findMany({
      where: { resolved: false, entry: { departmentId: { in: allHubIds } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const latestSnapshot = new Map<string, (typeof snapshots)[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { bootcamps, bootcampManagers, hubsByBootcamp, latestSnapshot, alerts };
}

export async function getYCProgramData(programDepartmentId: string) {
  // YC hubs are direct children of the program
  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: programDepartmentId },
    select: { id: true, name: true },
  });

  const [metrics, weeklyReports, studentCount] = await Promise.all([
    getYCManagerMetrics(programDepartmentId),
    getWeeklyReportsByDepartment(programDepartmentId),
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE", departmentId: { in: [programDepartmentId, ...hubs.map(h => h.id)] } } }),
  ]);

  return { hubs, metrics, weeklyReports, studentCount };
}

export async function getProgramWeeklyReports(programDepartmentId: string) {
  return getWeeklyReportsByDepartment(programDepartmentId);
}

export async function getAllProgramsData(departmentIds: string[]) {
  const orgRoot = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true },
  });

  const programDepts = orgRoot
    ? await prisma.department.findMany({
        where: { id: { in: departmentIds }, parentDepartmentId: orgRoot.id },
        select: { id: true, name: true },
      })
    : [];

  const programMap = Object.fromEntries(programDepts.map(p => [p.id, p.name]));

  const programTypes = ["YOUTH_CODING", "BOOTCAMP", "TEACHER_TRAINING", "OUTREACH"] as const;
  const programData: Record<string, unknown> = {};

  for (const program of programDepts) {
    const type = detectProgramType(program.name);
    if (type === "YOUTH_CODING") {
      programData.ycData = await getYCProgramData(program.id).catch(() => null);
    } else if (type === "BOOTCAMP") {
      programData.bootcampData = await getProgramDashboardData(program.id).catch(() => null);
    } else if (type === "TEACHER_TRAINING") {
      programData.ttReports = (programData.ttReports as Array<unknown> || []).concat(
        await getWeeklyReportsByDepartment(program.id).catch(() => [])
      );
    } else if (type === "OUTREACH") {
      programData.outreachReports = (programData.outreachReports as Array<unknown> || []).concat(
        await getWeeklyReportsByDepartment(program.id).catch(() => [])
      );
    }
  }

  return {
    ycData: programData.ycData as Awaited<ReturnType<typeof getYCProgramData>> | null ?? null,
    bootcampData: programData.bootcampData as Awaited<ReturnType<typeof getProgramDashboardData>> | null ?? null,
    ttReports: (programData.ttReports || []) as Awaited<ReturnType<typeof getWeeklyReportsByDepartment>>,
    outreachReports: (programData.outreachReports || []) as Awaited<ReturnType<typeof getWeeklyReportsByDepartment>>,
    programMap,
  };
}
