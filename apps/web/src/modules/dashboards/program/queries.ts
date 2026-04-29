import { prisma, Role, PeriodType } from "@orgos/db";

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
