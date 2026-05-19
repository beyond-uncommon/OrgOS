import { prisma, Role, PeriodType } from "@orgos/db";

export async function getCountryDashboardData(departmentIds?: string[]) {
  const deptFilter = departmentIds ? { in: departmentIds } : undefined;

  const programs = deptFilter
    ? await prisma.department.findMany({
        where: { id: { in: departmentIds! } },
        select: { id: true, name: true },
      })
    : [];

  const programIds = programs.map((p) => p.id);

  const alerts = await prisma.alert.findMany({
    where: {
      resolved: false,
      ...(deptFilter ? { entry: { departmentId: deptFilter } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const bootcamps = programIds.length > 0
    ? await prisma.department.findMany({
        where: { parentDepartmentId: { in: programIds } },
        select: { id: true, name: true, parentDepartmentId: true },
      })
    : [];
  const bootcampIds = bootcamps.map((b) => b.id);

  const hubs = bootcampIds.length > 0
    ? await prisma.department.findMany({
        where: { parentDepartmentId: { in: bootcampIds } },
        select: { id: true, parentDepartmentId: true },
      })
    : [];
  const hubIds = hubs.map((h) => h.id);

  const [allProgramManagers, snapshots, studentCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.PROGRAM_MANAGER, ...(deptFilter ? { departmentId: deptFilter } : {}) },
      select: { departmentId: true, name: true },
    }),
    hubIds.length > 0
      ? prisma.dashboardSnapshot.findMany({
          where: { departmentId: { in: hubIds }, periodType: PeriodType.DAILY },
          orderBy: { periodStart: "desc" },
        })
      : Promise.resolve([]),
    deptFilter
      ? prisma.student.count({ where: { departmentId: deptFilter, enrollmentStatus: "ACTIVE" } })
      : Promise.resolve(0),
  ]);

  const latestSnapshot = new Map<string, (typeof snapshots)[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { programs, programManagers: allProgramManagers, bootcamps, hubs, latestSnapshot, alerts, studentCount };
}
