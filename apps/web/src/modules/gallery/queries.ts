import { prisma } from "@orgos/db";

export async function getPublicPhotos(program?: string) {
  const where = program ? { program } : {};
  return prisma.photo.findMany({
    where,
    orderBy: [{ featured: "desc" }, { eventDate: "desc" }],
    include: { department: { select: { name: true } } },
  });
}

export async function getFeaturedPhotos() {
  return prisma.photo.findMany({
    where: { featured: true },
    orderBy: { eventDate: "desc" },
    take: 6,
    select: { id: true, url: true, caption: true, eventName: true, program: true },
  });
}