import { prisma } from "@orgos/db";

export async function getCountryDashboardData() {
  const orgRoot = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true },
  });

  const programs = orgRoot
    ? await prisma.department.findMany({
        where: { parentDepartmentId: orgRoot.id },
        select: { id: true, name: true },
      })
    : [];

  const programIds = programs.map((p) => p.id);

  const alerts = await prisma.alert.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const bootcamps = await prisma.department.findMany({
    where: { parentDepartmentId: { in: programIds } },
    select: { id: true, name: true, parentDepartmentId: true },
  });
  const bootcampIds = bootcamps.map((b) => b.id);

  const hubs = await prisma.department.findMany({
    where: { parentDepartmentId: { in: bootcampIds } },
    select: { id: true, parentDepartmentId: true },
  });
  const hubIds = hubs.map((h) => h.id);

  const [programManagers, snapshots, studentCount] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: programIds }, role: "PROGRAM_MANAGER" },
      select: { departmentId: true, name: true },
    }),
    prisma.dashboardSnapshot.findMany({
      where: { departmentId: { in: hubIds }, periodType: "DAILY" },
      orderBy: { periodStart: "desc" },
    }),
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE" } }),
  ]);

  const latestSnapshot = new Map<string, (typeof snapshots)[0]>();
  for (const s of snapshots) {
    if (s.departmentId && !latestSnapshot.has(s.departmentId)) latestSnapshot.set(s.departmentId, s);
  }

  return { programs, programManagers, bootcamps, hubs, latestSnapshot, alerts, studentCount };
}
