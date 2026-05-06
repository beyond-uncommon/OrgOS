/**
 * Import script: Dzivarasekwa Youth Coding Database
 *
 * Usage (from monorepo root):
 *   DATABASE_URL="..." npx tsx scripts/import-dzivarasekwa.ts
 *
 * The hub "yc-hub-dzivarasekwa" must already exist (created by seed).
 * Run this AFTER seeding. It clears existing Dzivarasekwa students/sessions first.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient, Role, ProjectStatus } from "../apps/web/.prisma/client";

const prisma = new PrismaClient();
const HUB_ID = "yc-hub-dzivarasekwa";
const CSV_PATH = join(
  process.env.HOME ?? "",
  "Downloads/2026_Dzivarasekwa-Youth-Coding-Program_Database - YC Student Database.csv",
);

// -- CSV parser (no dependencies) -------------------------------------------

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(field); field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

// -- helpers -----------------------------------------------------------------

function normalizeGender(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (v === "male") return "M";
  if (v === "female") return "F";
  if (v) return "Other";
  return null;
}

function normalizeSchool(raw: string): string | null {
  const v = raw.trim();
  if (!v || v.toLowerCase().startsWith("begin typing")) return null;
  return v;
}

function normalizeProjectStatus(raw: string): ProjectStatus {
  return raw.trim().toLowerCase() === "complete"
    ? ProjectStatus.COMPLETE
    : ProjectStatus.NOT_COMPLETE;
}

function parseDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// -- types -------------------------------------------------------------------

interface LessonEntry {
  date: Date;
  lessonNumber: number;
  projectName: string;
  projectStatus: ProjectStatus;
  attended: boolean;
}

interface StudentRow {
  firstName: string;
  lastName: string;
  gender: string | null;
  age: number | null;
  grade: string | null;
  community: string | null;
  school: string | null;
  lessons: LessonEntry[];
}

// -- main --------------------------------------------------------------------

async function main() {
  console.log("Importing Dzivarasekwa Youth Coding data...");

  // Verify hub exists
  const hub = await prisma.department.findUnique({ where: { id: HUB_ID } });
  if (!hub) throw new Error(`Hub ${HUB_ID} not found. Run seed first.`);

  // Parse CSV (rows 0-1 = headers, row 2 = column names, row 3+ = data)
  const content = readFileSync(CSV_PATH, "utf-8");
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const dataLines = lines.slice(3); // skip 2 header rows + 1 column name row

  const rows: StudentRow[] = [];
  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    const firstName = cols[1]?.trim() ?? "";
    const lastName = cols[2]?.trim() ?? "";
    if (!firstName && !lastName) continue;

    const lessons: LessonEntry[] = [];
    for (let i = 11; i + 5 < cols.length; i += 6) {
      const date = parseDate(cols[i] ?? "");
      const lessonNumber = parseInt(cols[i + 1] ?? "", 10);
      if (!date || isNaN(lessonNumber)) continue;
      lessons.push({
        date,
        lessonNumber,
        projectName: cols[i + 4]?.trim() || "Unknown",
        projectStatus: normalizeProjectStatus(cols[i + 5] ?? ""),
        attended: (cols[i + 3] ?? "").trim().toLowerCase() === "present",
      });
    }

    const ageRaw = parseInt(cols[4] ?? "", 10);
    rows.push({
      firstName,
      lastName,
      gender: normalizeGender(cols[3] ?? ""),
      age: isNaN(ageRaw) ? null : ageRaw,
      grade: cols[5]?.trim() || null,
      community: cols[6]?.trim() || null,
      school: normalizeSchool(cols[7] ?? ""),
      lessons,
    });
  }

  console.log(`  Parsed ${rows.length} students.`);

  // Clear existing data for this hub
  const existing = await prisma.student.findMany({
    where: { departmentId: HUB_ID },
    select: { id: true },
  });
  if (existing.length) {
    await prisma.sessionAttendance.deleteMany({ where: { studentId: { in: existing.map(s => s.id) } } });
    await prisma.student.deleteMany({ where: { departmentId: HUB_ID } });
  }
  await prisma.youthCodingSession.deleteMany({ where: { departmentId: HUB_ID } });
  console.log(`  Cleared ${existing.length} existing students and their sessions.`);

  // Ensure coordinator user
  let coordinator = await prisma.user.findUnique({ where: { email: "dzivarasekwa.coord@uncommon.org" } });
  if (!coordinator) {
    coordinator = await prisma.user.create({
      data: {
        email: "dzivarasekwa.coord@uncommon.org",
        name: "Dzivarasekwa Coordinator",
        role: Role.STUDENT,
        departmentId: HUB_ID,
      },
    });
  }

  // Create Student records (sequential to avoid connection pool exhaustion)
  const studentRecords = [];
  for (const r of rows) {
    const s = await prisma.student.create({
      data: {
        name: `${r.firstName} ${r.lastName}`.trim(),
        departmentId: HUB_ID,
        instructorId: coordinator!.id,
        enrollmentStatus: "ACTIVE",
        age: r.age,
        gender: r.gender,
        school: r.school,
        grade: r.grade,
        community: r.community,
      },
    });
    studentRecords.push(s);
  }
  console.log(`  Students inserted: ${studentRecords.length}`);

  // Build unique sessions: "dateStr|lessonNumber"
  const sessionMap = new Map<string, { date: Date; lessonNumber: number; projectName: string }>();
  for (const row of rows) {
    for (const lesson of row.lessons) {
      const key = `${lesson.date.toISOString().split("T")[0]}|${lesson.lessonNumber}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, { date: lesson.date, lessonNumber: lesson.lessonNumber, projectName: lesson.projectName });
      }
    }
  }

  const sessionIdMap = new Map<string, string>();
  for (const [key, s] of sessionMap) {
    const session = await prisma.youthCodingSession.create({
      data: {
        date: s.date,
        lessonNumber: s.lessonNumber,
        projectName: s.projectName,
        school: "Dzivarasekwa",
        community: "Dzivarasekwa",
        departmentId: HUB_ID,
        submittedById: coordinator.id,
        instructorIds: [],
      },
    });
    sessionIdMap.set(key, session.id);
  }

  // Create attendance records
  let attendanceCount = 0;
  for (let i = 0; i < rows.length; i++) {
    for (const lesson of rows[i]!.lessons) {
      const key = `${lesson.date.toISOString().split("T")[0]}|${lesson.lessonNumber}`;
      const sessionId = sessionIdMap.get(key);
      if (!sessionId) continue;
      await prisma.sessionAttendance.create({
        data: { sessionId, studentId: studentRecords[i]!.id, projectStatus: lesson.projectStatus },
      });
      attendanceCount++;
    }
  }

  console.log(`  Created ${studentRecords.length} students.`);
  console.log(`  Created ${sessionIdMap.size} sessions.`);
  console.log(`  Created ${attendanceCount} attendance records.`);
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
