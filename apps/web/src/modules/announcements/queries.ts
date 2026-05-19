import { prisma } from "@orgos/db";

export async function getAnnouncementsForUser(
  userId: string,
  departmentId: string | null,
  role: string
) {
  const now = new Date();

  const scopes: Array<"HUB" | "PROGRAM" | "ORG"> = ["HUB"];
  if (["HUB_LEAD", "ADMIN", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR"].includes(role)) {
    scopes.push("PROGRAM", "ORG");
  }

  return prisma.announcement.findMany({
    where: {
      AND: [
        {
          OR: [
            { scope: { in: scopes } },
            { departmentId },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [
      { pinned: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      author: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
}

export async function getOrgAnnouncements() {
  return prisma.announcement.findMany({
    where: { scope: "ORG" },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
}

export async function getDepartmentAnnouncements(departmentId: string) {
  return prisma.announcement.findMany({
    where: {
      OR: [
        { scope: "HUB", departmentId },
        { scope: { in: ["PROGRAM", "ORG"] } },
      ],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
}