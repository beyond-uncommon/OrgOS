import { prisma } from "@orgos/db";

export async function getBootcampDashboardData(bootcampDepartmentId: string) {
  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: bootcampDepartmentId },
    select: { id: true, name: true },
  });
  const hubIdList = hubs.map((h) => h.id);

  const [hubLeads, snapshots, lastEntries, alerts] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: hubIdList }, role: "HUB_LEAD" },
      select: { departmentId: true, name: true },
    }),
    prisma.dashboardSnapshot.findMany({
      where: { departmentId: { in: hubIdList }, periodType: "DAILY" },
      orderBy: { periodStart: "desc" },
    }),
    prisma.dailyEntry.findMany({
      where: { departmentId: { in: hubIdList } },
      orderBy: { date: "desc" },
      distinct: ["departmentId"],
      select: { departmentId: true, date: true },
    }),
    prisma.alert.findMany({
      where: { resolved: false, entry: { departmentId: { in: hubIdList } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // De-duplicate snapshots — keep latest per department
  const latestSnapshot = new Map<string, (typeof snapshots)[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { hubs, hubLeads, latestSnapshot, lastEntries, alerts };
}
