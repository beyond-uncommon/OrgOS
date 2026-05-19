import { prisma } from "@orgos/db";

export type StorySummary = Awaited<ReturnType<typeof getPublishedStories>>[number];

export type StoryDetail = Awaited<ReturnType<typeof getStoryById>>;

export async function getPublishedStories(limit = 10) {
  return prisma.story.findMany({
    where: { published: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      excerpt: true,
      authorName: true,
      authorRole: true,
      studentAge: true,
      studentProgram: true,
      heroImage: true,
      tags: true,
      featured: true,
      viewCount: true,
      createdAt: true,
      department: { select: { name: true } },
    },
  });
}

export async function getFeaturedStories() {
  return prisma.story.findMany({
    where: { published: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      excerpt: true,
      authorName: true,
      authorRole: true,
      studentAge: true,
      studentProgram: true,
      heroImage: true,
      tags: true,
      createdAt: true,
      department: { select: { name: true } },
    },
  });
}

export async function getStoryById(id: string) {
  return prisma.story.findUnique({
    where: { id },
    include: { department: { select: { name: true } } },
  });
}

export async function getAllStories() {
  return prisma.story.findMany({
    orderBy: { createdAt: "desc" },
    include: { department: { select: { name: true } } },
  });
}

export async function incrementStoryView(id: string) {
  return prisma.story.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });
}