export const dynamic = "force-dynamic";

import { prisma } from "@orgos/db";
import { PortalClient } from "./PortalClient";

async function getOverviewData() {
  const org = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true },
  });
  const orgId = org?.id ?? "";

  const [totalStudents, programs, fundingRecords] = await Promise.all([
    prisma.student.count({ where: { enrollmentStatus: "ACTIVE" } }),
    prisma.department.count({
      where: { parentDepartmentId: orgId },
    }),
    prisma.fundingRecord.aggregate({ _sum: { amount: true } }),
  ]);

  const programIds = (await prisma.department.findMany({
    where: { parentDepartmentId: orgId },
    select: { id: true, name: true },
  })).map(p => p.id);

  const hubs = await prisma.department.count({
    where: { parentDepartmentId: { in: programIds } },
  });

  return {
    totalStudents,
    totalPrograms: programs,
    totalHubs: hubs,
    totalFunding: fundingRecords._sum.amount || 0,
  };
}

async function getProgramData() {
  const topLevel = await prisma.department.findFirst({
    where: { parentDepartmentId: null },
    select: { id: true },
  });
  if (!topLevel) return [];

  const programs = await prisma.department.findMany({
    where: { parentDepartmentId: topLevel.id },
    select: { id: true, name: true },
  });

  return programs.map(program => ({
    id: program.id,
    name: program.name,
    studentCount: 0,
    completionRate: 78,
    hubCount: 0,
    impact: getProgramImpact(program.name),
  }));
}

function getProgramImpact(name: string): string {
  const impacts: Record<string, string> = {
    "Youth Coding Program": "Building digital literacy for 10,000+ youth across 15 communities",
    "Bootcamp Program": "Transformative design & development training with 85% job placement",
    "Teacher Training Program": "Empowering 500+ educators with modern teaching methodologies",
    "Outreach Program": "Extending educational access to underserved regions",
  };
  return impacts[name] || "Creating lasting impact through education and innovation";
}

async function getStories() {
  const stories = await prisma.story.findMany({
    where: { published: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return stories;
}

async function getStudentQuotes() {
  const quotes = await prisma.studentReport.findMany({
    where: { rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { student: true },
  });
  return quotes.map(q => ({
    quote: q.enjoyed,
    student: q.student.name,
    rating: q.rating,
  }));
}

async function getFundingByProgram() {
  const funding = await prisma.fundingRecord.findMany({
    include: { program: true },
  });

  const byProgram: Record<string, number> = {};
  let unassigned = 0;

  funding.forEach(f => {
    if (f.programId) {
      const programName = f.program?.name || "Unknown Program";
      byProgram[programName] = (byProgram[programName] || 0) + f.amount;
    } else {
      unassigned += f.amount;
    }
  });

  const total = Object.values(byProgram).reduce((a, b) => a + b, 0) + unassigned;
  
  return {
    byProgram: Object.entries(byProgram).map(([name, amount]) => ({
      name,
      amount,
      percentage: Math.round((amount / total) * 100),
    })),
    unassigned,
    total,
  };
}

async function getPhotos() {
  const photos = await prisma.photo.findMany({
    where: { featured: true },
    orderBy: { eventDate: "desc" },
    take: 8,
  });
  return photos;
}

export default async function PortalPage() {
  const [overview, programs, stories, quotes, funding, photos] = await Promise.all([
    getOverviewData(),
    getProgramData(),
    getStories(),
    getStudentQuotes(),
    getFundingByProgram(),
    getPhotos(),
  ]);

  return (
    <PortalClient
      overview={overview}
      programs={programs}
      stories={stories}
      quotes={quotes}
      funding={funding}
      photos={photos}
    />
  );
}