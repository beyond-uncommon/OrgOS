# Student Role & Youth Coding Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `STUDENT` staff role that submits structured youth coding session reports, with hub and org dashboards showing live youth coding student counts.

**Architecture:** Extend the Prisma schema with `YouthCodingSession` and `SessionAttendance` models, add a `STUDENT` case to the existing role-routing switch, then build a new `youth-coding` module following the existing `daily-inputs`/`dashboards` module pattern. Dashboard rollups attach as new query functions + YCPanel component onto existing dashboard pages.

**Tech Stack:** Next.js 14 App Router, Prisma 5, MUI (sx props), TypeScript strict, Zod validation, `ActionResult<T>` server action pattern.

> **Note on testing:** Vitest test files exist in the repo but the test runner is not configured (no vitest dependency or config). Skip TDD steps — implement directly and verify via the running app.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `apps/web/src/app/student/page.tsx` | STUDENT dashboard page |
| `apps/web/src/app/student/students/page.tsx` | My Students page |
| `apps/web/src/app/submit-session/page.tsx` | Session submission page |
| `apps/web/src/app/youth-coding/page.tsx` | YC Master Database page |
| `apps/web/src/modules/youth-coding/queries.ts` | All YC Prisma queries |
| `apps/web/src/modules/youth-coding/actions/submitSession.ts` | Submit session server action |
| `apps/web/src/modules/youth-coding/actions/registerStudent.ts` | Register student server action |
| `apps/web/src/modules/youth-coding/actions/updateStudent.ts` | Update student server action |
| `apps/web/src/modules/youth-coding/schema.ts` | Zod schemas for YC forms |
| `apps/web/src/modules/youth-coding/components/SessionForm.tsx` | Two-phase session submission form |
| `apps/web/src/modules/youth-coding/components/StudentRegisterRow.tsx` | Single student registration row |
| `apps/web/src/modules/youth-coding/components/YCPanel.tsx` | Reusable YC metrics panel for dashboards |

### Modified files
| File | Change |
|------|--------|
| `packages/db/prisma/schema.prisma` | Add `STUDENT` to Role enum; extend `Student`; add `YouthCodingSession`, `SessionAttendance`, `ProjectStatus` |
| `apps/web/src/lib/auth/redirect-by-role.ts` | Add `STUDENT` case → `/student` |
| `packages/db/prisma/seed.ts` | Add 3 STUDENT users, 15 youth students, 9 sessions |
| `apps/web/src/modules/dashboards/instructor/queries.ts` | Add `getYCSummaryForInstructor` |
| `apps/web/src/modules/dashboards/bootcamp/queries.ts` | Add `getYCAggregateForBootcamp` |
| `apps/web/src/modules/dashboards/country/queries.ts` | Add `getYCOrgSummary` |
| `apps/web/src/app/departments/[departmentId]/page.tsx` | Add YCPanel |
| `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx` | Add YCPanel |
| `apps/web/src/app/bootcamps/[departmentId]/page.tsx` | Add YCPanel |
| `apps/web/src/app/country/page.tsx` | Add YCPanel |

---

## Task 1: Schema Changes

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add `STUDENT` to the Role enum**

Open `packages/db/prisma/schema.prisma`. Find the `enum Role` block and add `STUDENT` as the last entry before the closing brace:

```prisma
enum Role {
  INSTRUCTOR
  HUB_LEAD
  // ... existing values ...
  ADMIN
  STUDENT
}
```

- [ ] **Step 2: Extend the `Student` model**

Find the `model Student` block. Add these 5 fields after `enrollmentStatus`:

```prisma
  age              Int
  gender           String
  school           String
  grade            String
  community        String
```

- [ ] **Step 3: Add `SessionAttendance` relation to the `Student` model**

In the `model Student` block, add a relation field after the existing relations:

```prisma
  sessionAttendance SessionAttendance[]
```

- [ ] **Step 4: Add `YouthCodingSession` relation to `User` and `Department` models**

In `model User`, add after the last relation:
```prisma
  submittedSessions YouthCodingSession[] @relation("SessionSubmitter")
```

In `model Department`, add after the last relation:
```prisma
  youthCodingSessions YouthCodingSession[]
```

- [ ] **Step 5: Add `ProjectStatus` enum**

After the last existing enum, add:

```prisma
enum ProjectStatus {
  COMPLETE
  NOT_COMPLETE
}
```

- [ ] **Step 6: Add `YouthCodingSession` model**

After the `BoardPolicy` model, add:

```prisma
model YouthCodingSession {
  id            String              @id @default(cuid())
  date          DateTime            @db.Date
  lessonNumber  Int
  projectName   String
  school        String
  community     String
  departmentId  String
  submittedById String
  instructorIds Json
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  department    Department          @relation(fields: [departmentId], references: [id])
  submittedBy   User                @relation("SessionSubmitter", fields: [submittedById], references: [id])
  attendance    SessionAttendance[]

  @@index([departmentId, date])
  @@index([submittedById])
}
```

- [ ] **Step 7: Add `SessionAttendance` model**

After `YouthCodingSession`, add:

```prisma
model SessionAttendance {
  id            String             @id @default(cuid())
  sessionId     String
  studentId     String
  projectStatus ProjectStatus      @default(NOT_COMPLETE)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  session       YouthCodingSession @relation(fields: [sessionId], references: [id])
  student       Student            @relation(fields: [studentId], references: [id])

  @@unique([sessionId, studentId])
  @@index([sessionId])
  @@index([studentId])
}
```

- [ ] **Step 8: Push schema to database**

```bash
cd packages/db && DATABASE_URL="$(grep DATABASE_URL ../../apps/web/.env.local | cut -d= -f2-)" npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 9: Regenerate Prisma client**

```bash
cd packages/db && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 10: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(schema): add STUDENT role, YouthCodingSession, SessionAttendance models"
```

---

## Task 2: Auth Routing for STUDENT Role

**Files:**
- Modify: `apps/web/src/lib/auth/redirect-by-role.ts`

- [ ] **Step 1: Add the STUDENT case**

Open `apps/web/src/lib/auth/redirect-by-role.ts`. In the switch statement, add before the `default` case:

```typescript
case "STUDENT":
  redirect(`/student`);
```

The STUDENT dashboard is not scoped by departmentId in the URL — the department is derived from the session user server-side.

- [ ] **Step 2: Verify login flow still works for existing roles**

Start the dev server: `cd apps/web && pnpm dev`

Log in as an INSTRUCTOR demo account and confirm redirect works. Log in as HUB_LEAD and confirm. Log in with an unknown role and confirm redirect to `/coming-soon`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/auth/redirect-by-role.ts
git commit -m "feat(auth): route STUDENT role to /student dashboard"
```

---

## Task 3: Youth Coding Module — Zod Schemas

**Files:**
- Create: `apps/web/src/modules/youth-coding/schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
import { z } from "zod";

export const studentRegistrationSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(1).max(25),
  gender: z.enum(["M", "F", "Other"]),
  school: z.string().min(1),
  grade: z.string().min(1),
  community: z.string().min(1),
});

export const sessionPhase1Schema = z.object({
  date: z.string().min(1),
  lessonNumber: z.number().int().min(1),
  projectName: z.string().min(1),
  school: z.string().min(1),
  community: z.string().min(1),
  instructorIds: z.array(z.string()).min(1, "At least one instructor required"),
});

export const attendanceRecordSchema = z.object({
  studentId: z.string(),
  present: z.boolean(),
  projectStatus: z.enum(["COMPLETE", "NOT_COMPLETE"]),
});

export const sessionSubmissionSchema = z.object({
  phase1: sessionPhase1Schema,
  attendance: z.array(attendanceRecordSchema),
  newStudents: z.array(studentRegistrationSchema).optional(),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
export type SessionSubmissionInput = z.infer<typeof sessionSubmissionSchema>;
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/modules/youth-coding/schema.ts
git commit -m "feat(youth-coding): add Zod schemas for session and student forms"
```

---

## Task 4: Youth Coding Module — Queries

**Files:**
- Create: `apps/web/src/modules/youth-coding/queries.ts`

- [ ] **Step 1: Create queries file**

```typescript
import { prisma, Role } from "@orgos/db";

export async function getStudentsForUser(userId: string) {
  return prisma.student.findMany({
    where: { instructorId: userId, enrollmentStatus: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}

export async function getSessionsForUser(userId: string) {
  return prisma.youthCodingSession.findMany({
    where: { submittedById: userId },
    include: {
      attendance: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getDepartmentUsersForSession(departmentId: string) {
  return prisma.user.findMany({
    where: { departmentId },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getYCHubSummary(departmentId: string) {
  const sessionsThisMonth = await prisma.youthCodingSession.findMany({
    where: {
      departmentId,
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    include: { attendance: true },
  });

  const uniqueStudents = await prisma.sessionAttendance.findMany({
    where: { session: { departmentId } },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const totalAttendance = sessionsThisMonth.flatMap(s => s.attendance);
  const completionRate =
    totalAttendance.length > 0
      ? Math.round(
          (totalAttendance.filter(a => a.projectStatus === "COMPLETE").length /
            totalAttendance.length) *
            100,
        )
      : 0;

  const schoolBreakdown = sessionsThisMonth.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.school] = (acc[s.school] ?? 0) + s.attendance.length;
      return acc;
    },
    {},
  );

  return {
    uniqueStudentCount: uniqueStudents.length,
    sessionsThisMonth: sessionsThisMonth.length,
    completionRate,
    schoolBreakdown,
  };
}

export async function getYCInstructorSummary(instructorId: string) {
  const studentUsers = await prisma.user.findMany({
    where: {
      department: {
        users: { some: { id: instructorId } },
      },
      role: Role.STUDENT,
    },
    select: { id: true },
  });

  const studentUserIds = studentUsers.map(u => u.id);

  const uniqueYouthStudents = await prisma.student.count({
    where: { instructorId: { in: studentUserIds }, enrollmentStatus: "ACTIVE" },
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sessionsThisWeek = await prisma.youthCodingSession.count({
    where: {
      submittedById: { in: studentUserIds },
      date: { gte: weekAgo },
    },
  });

  const recentAttendance = await prisma.sessionAttendance.findMany({
    where: {
      session: {
        submittedById: { in: studentUserIds },
        date: { gte: weekAgo },
      },
    },
    select: { projectStatus: true },
  });

  const completionRate =
    recentAttendance.length > 0
      ? Math.round(
          (recentAttendance.filter(a => a.projectStatus === "COMPLETE").length /
            recentAttendance.length) *
            100,
        )
      : 0;

  return { uniqueYouthStudents, sessionsThisWeek, completionRate };
}

export async function getYCBootcampAggregate(hubDepartmentIds: string[]) {
  const uniqueStudents = await prisma.sessionAttendance.findMany({
    where: { session: { departmentId: { in: hubDepartmentIds } } },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const sessionsThisMonth = await prisma.youthCodingSession.count({
    where: {
      departmentId: { in: hubDepartmentIds },
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  return {
    uniqueStudentCount: uniqueStudents.length,
    sessionsThisMonth,
  };
}

export async function getYCOrgSummary(allHubDepartmentIds: string[]) {
  const [uniqueStudents, currentMonthSessions, genderBreakdown, schoolCount] =
    await Promise.all([
      prisma.sessionAttendance.findMany({
        where: { session: { departmentId: { in: allHubDepartmentIds } } },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      prisma.youthCodingSession.count({
        where: {
          departmentId: { in: allHubDepartmentIds },
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.student.groupBy({
        by: ["gender"],
        where: { enrollmentStatus: "ACTIVE" },
        _count: true,
      }),
      prisma.youthCodingSession.findMany({
        select: { school: true },
        distinct: ["school"],
      }),
    ]);

  return {
    totalUniqueStudents: uniqueStudents.length,
    sessionsThisMonth: currentMonthSessions,
    genderBreakdown: genderBreakdown.map(g => ({
      gender: g.gender,
      count: g._count,
    })),
    schoolCount: schoolCount.length,
  };
}

export async function getYCMasterList() {
  return prisma.student.findMany({
    where: { enrollmentStatus: "ACTIVE" },
    include: {
      department: { select: { id: true, name: true } },
      instructor: { select: { id: true, name: true } },
      sessionAttendance: {
        include: {
          session: { select: { id: true, date: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/modules/youth-coding/queries.ts
git commit -m "feat(youth-coding): add Prisma queries for sessions, students, and dashboard rollups"
```

---

## Task 5: Youth Coding Module — Server Actions

**Files:**
- Create: `apps/web/src/modules/youth-coding/actions/registerStudent.ts`
- Create: `apps/web/src/modules/youth-coding/actions/submitSession.ts`
- Create: `apps/web/src/modules/youth-coding/actions/updateStudent.ts`

- [ ] **Step 1: Create `registerStudent.ts`**

```typescript
"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { studentRegistrationSchema } from "../schema";

export async function registerStudent(
  instructorId: string,
  departmentId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = studentRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const student = await prisma.student.create({
    data: {
      name: parsed.data.name,
      age: parsed.data.age,
      gender: parsed.data.gender,
      school: parsed.data.school,
      grade: parsed.data.grade,
      community: parsed.data.community,
      departmentId,
      instructorId,
      enrollmentStatus: "ACTIVE",
    },
    select: { id: true, name: true },
  });

  return { success: true, data: student };
}
```

- [ ] **Step 2: Create `submitSession.ts`**

```typescript
"use server";

import { prisma, ProjectStatus } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { sessionSubmissionSchema } from "../schema";

export async function submitSession(
  submittedById: string,
  departmentId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionSubmissionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { phase1, attendance, newStudents } = parsed.data;

  // Validate instructorIds belong to this department
  const validUsers = await prisma.user.findMany({
    where: { departmentId, id: { in: phase1.instructorIds } },
    select: { id: true },
  });
  if (validUsers.length !== phase1.instructorIds.length) {
    return { success: false, error: "One or more instructor IDs are invalid for this department." };
  }

  // Register any new students first
  const newStudentIds: string[] = [];
  if (newStudents?.length) {
    for (const s of newStudents) {
      const created = await prisma.student.create({
        data: {
          name: s.name,
          age: s.age,
          gender: s.gender,
          school: s.school,
          grade: s.grade,
          community: s.community,
          departmentId,
          instructorId: submittedById,
          enrollmentStatus: "ACTIVE",
        },
        select: { id: true },
      });
      newStudentIds.push(created.id);
    }
  }

  // Build attendance rows (only present students)
  const presentAttendance = attendance.filter(a => a.present);

  const session = await prisma.youthCodingSession.create({
    data: {
      date: new Date(phase1.date),
      lessonNumber: phase1.lessonNumber,
      projectName: phase1.projectName,
      school: phase1.school,
      community: phase1.community,
      departmentId,
      submittedById,
      instructorIds: phase1.instructorIds,
      attendance: {
        create: presentAttendance.map(a => ({
          studentId: a.studentId,
          projectStatus: a.projectStatus as ProjectStatus,
        })),
      },
    },
    select: { id: true },
  });

  return { success: true, data: session };
}
```

- [ ] **Step 3: Create `updateStudent.ts`**

```typescript
"use server";

import { prisma } from "@orgos/db";
import type { ActionResult } from "@orgos/utils";
import { studentRegistrationSchema } from "../schema";

export async function updateStudent(
  studentId: string,
  formData: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = studentRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const student = await prisma.student.update({
    where: { id: studentId },
    data: parsed.data,
    select: { id: true },
  });

  return { success: true, data: student };
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/modules/youth-coding/actions/
git commit -m "feat(youth-coding): add registerStudent, submitSession, updateStudent server actions"
```

---

## Task 6: YCPanel Component

**Files:**
- Create: `apps/web/src/modules/youth-coding/components/YCPanel.tsx`

- [ ] **Step 1: Create YCPanel**

This is a presentational component used by all four dashboard levels. It receives pre-fetched data as props so each dashboard can pass its own query result.

```typescript
import { Box, Typography, Divider } from "@mui/material";

interface SchoolBreakdownEntry {
  school: string;
  count: number;
}

interface YCPanelProps {
  uniqueStudents: number;
  sessionCount: number;
  completionRate?: number;
  schoolBreakdown?: SchoolBreakdownEntry[];
  genderBreakdown?: { gender: string; count: number }[];
  schoolCount?: number;
  label?: string;
}

export function YCPanel({
  uniqueStudents,
  sessionCount,
  completionRate,
  schoolBreakdown,
  genderBreakdown,
  schoolCount,
  label = "Youth Coding",
}: YCPanelProps) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
        {label}
      </Typography>

      <Box sx={{ display: "flex", gap: 4, mt: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {uniqueStudents}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Students Taught
          </Typography>
        </Box>

        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {sessionCount}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Sessions This Month
          </Typography>
        </Box>

        {completionRate !== undefined && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {completionRate}%
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Completion Rate
            </Typography>
          </Box>
        )}

        {schoolCount !== undefined && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {schoolCount}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Schools
            </Typography>
          </Box>
        )}
      </Box>

      {genderBreakdown && genderBreakdown.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", gap: 3 }}>
            {genderBreakdown.map(g => (
              <Box key={g.gender}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {g.count}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : "Other"}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}

      {schoolBreakdown && schoolBreakdown.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
            By School
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {schoolBreakdown.map(s => (
              <Box
                key={s.school}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  fontSize: "0.75rem",
                }}
              >
                {s.school}: {s.count}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/modules/youth-coding/components/YCPanel.tsx
git commit -m "feat(youth-coding): add YCPanel reusable dashboard component"
```

---

## Task 7: StudentRegisterRow Component

**Files:**
- Create: `apps/web/src/modules/youth-coding/components/StudentRegisterRow.tsx`

- [ ] **Step 1: Create StudentRegisterRow**

```typescript
"use client";

import { Box, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import type { StudentRegistrationInput } from "../schema";

interface StudentRegisterRowProps {
  index: number;
  value: Partial<StudentRegistrationInput>;
  onChange: (index: number, field: keyof StudentRegistrationInput, value: string | number) => void;
}

export function StudentRegisterRow({ index, value, onChange }: StudentRegisterRowProps) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-end", mb: 1.5 }}>
      <TextField
        label="Full Name"
        size="small"
        value={value.name ?? ""}
        onChange={e => onChange(index, "name", e.target.value)}
        sx={{ minWidth: 160 }}
        required
      />
      <TextField
        label="Age"
        type="number"
        size="small"
        value={value.age ?? ""}
        onChange={e => onChange(index, "age", Number(e.target.value))}
        sx={{ width: 70 }}
        required
      />
      <FormControl size="small" sx={{ minWidth: 90 }} required>
        <InputLabel>Gender</InputLabel>
        <Select
          value={value.gender ?? ""}
          label="Gender"
          onChange={e => onChange(index, "gender", e.target.value)}
        >
          <MenuItem value="M">M</MenuItem>
          <MenuItem value="F">F</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="School"
        size="small"
        value={value.school ?? ""}
        onChange={e => onChange(index, "school", e.target.value)}
        sx={{ minWidth: 140 }}
        required
      />
      <TextField
        label="Grade"
        size="small"
        value={value.grade ?? ""}
        onChange={e => onChange(index, "grade", e.target.value)}
        sx={{ width: 80 }}
        required
      />
      <TextField
        label="Community"
        size="small"
        value={value.community ?? ""}
        onChange={e => onChange(index, "community", e.target.value)}
        sx={{ minWidth: 120 }}
        required
      />
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/modules/youth-coding/components/StudentRegisterRow.tsx
git commit -m "feat(youth-coding): add StudentRegisterRow form component"
```

---

## Task 8: SessionForm Component

**Files:**
- Create: `apps/web/src/modules/youth-coding/components/SessionForm.tsx`

- [ ] **Step 1: Create SessionForm**

```typescript
"use client";

import { useState } from "react";
import {
  Box, Button, TextField, Typography, Checkbox, FormControlLabel,
  Select, MenuItem, FormControl, InputLabel, OutlinedInput, Chip,
  Alert,
} from "@mui/material";
import { submitSession } from "../actions/submitSession";
import { StudentRegisterRow } from "./StudentRegisterRow";
import type { StudentRegistrationInput, AttendanceRecord } from "../schema";

interface ExistingStudent {
  id: string;
  name: string;
}

interface DeptUser {
  id: string;
  name: string;
  role: string;
}

interface SessionFormProps {
  userId: string;
  departmentId: string;
  existingStudents: ExistingStudent[];
  departmentUsers: DeptUser[];
}

export function SessionForm({
  userId,
  departmentId,
  existingStudents,
  departmentUsers,
}: SessionFormProps) {
  const isFirstLesson = existingStudents.length === 0;

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lessonNumber, setLessonNumber] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [school, setSchool] = useState("");
  const [community, setCommunity] = useState("");
  const [instructorIds, setInstructorIds] = useState<string[]>([]);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    existingStudents.map(s => ({ studentId: s.id, present: false, projectStatus: "NOT_COMPLETE" as const })),
  );

  const [newStudents, setNewStudents] = useState<Partial<StudentRegistrationInput>[]>(
    isFirstLesson ? [{}] : [],
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateAttendance(studentId: string, field: "present" | "projectStatus", value: boolean | string) {
    setAttendance(prev =>
      prev.map(a => a.studentId === studentId ? { ...a, [field]: value } : a),
    );
  }

  function updateNewStudent(index: number, field: keyof StudentRegistrationInput, value: string | number) {
    setNewStudents(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitSession(userId, departmentId, {
      phase1: { date, lessonNumber, projectName, school, community, instructorIds },
      attendance,
      newStudents: newStudents.length > 0 ? newStudents : undefined,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        Session submitted successfully.
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Phase 1 — Session Details */}
      <Typography variant="h6">Session Details</Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Lesson Number"
          type="number"
          value={lessonNumber}
          onChange={e => setLessonNumber(Number(e.target.value))}
          required
          sx={{ width: 130 }}
        />
        <TextField
          label="Project Name"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          required
          sx={{ minWidth: 200, flex: 1 }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="School Name"
          value={school}
          onChange={e => setSchool(e.target.value)}
          required
          sx={{ minWidth: 200, flex: 1 }}
        />
        <TextField
          label="Community"
          value={community}
          onChange={e => setCommunity(e.target.value)}
          required
          sx={{ minWidth: 160, flex: 1 }}
        />
      </Box>

      <FormControl required>
        <InputLabel>Instructors Present</InputLabel>
        <Select
          multiple
          value={instructorIds}
          onChange={e => setInstructorIds(e.target.value as string[])}
          input={<OutlinedInput label="Instructors Present" />}
          renderValue={selected =>
            (selected as string[])
              .map(id => departmentUsers.find(u => u.id === id)?.name ?? id)
              .join(", ")
          }
        >
          {departmentUsers.map(u => (
            <MenuItem key={u.id} value={u.id}>
              <Checkbox checked={instructorIds.includes(u.id)} />
              {u.name} ({u.role})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Phase 2 — Students */}
      <Typography variant="h6">
        {isFirstLesson ? "Register Students" : "Student Attendance"}
      </Typography>

      {isFirstLesson ? (
        <Box>
          {newStudents.map((s, i) => (
            <StudentRegisterRow key={i} index={i} value={s} onChange={updateNewStudent} />
          ))}
          <Button
            size="small"
            onClick={() => setNewStudents(prev => [...prev, {}])}
            sx={{ mt: 1 }}
          >
            + Add Student
          </Button>
        </Box>
      ) : (
        <Box>
          {attendance.map(a => {
            const student = existingStudents.find(s => s.id === a.studentId);
            return (
              <Box
                key={a.studentId}
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={a.present}
                      onChange={e => updateAttendance(a.studentId, "present", e.target.checked)}
                    />
                  }
                  label={student?.name ?? a.studentId}
                  sx={{ minWidth: 200 }}
                />
                <FormControl size="small" disabled={!a.present} sx={{ minWidth: 160 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={a.projectStatus}
                    label="Status"
                    onChange={e =>
                      updateAttendance(a.studentId, "projectStatus", e.target.value)
                    }
                  >
                    <MenuItem value="COMPLETE">Complete</MenuItem>
                    <MenuItem value="NOT_COMPLETE">Not Complete</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            );
          })}
          <Button
            size="small"
            onClick={() =>
              setAttendance(prev => [
                ...prev,
                { studentId: `new-${Date.now()}`, present: true, projectStatus: "NOT_COMPLETE" },
              ])
            }
            sx={{ mt: 1 }}
          >
            + Add Student
          </Button>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? "Submitting…" : "Submit Session"}
      </Button>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/modules/youth-coding/components/SessionForm.tsx
git commit -m "feat(youth-coding): add two-phase SessionForm component"
```

---

## Task 9: STUDENT Dashboard Page

**Files:**
- Create: `apps/web/src/app/student/page.tsx`

- [ ] **Step 1: Create STUDENT dashboard**

```typescript
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser, getSessionsForUser } from "@/modules/youth-coding/queries";
import { UserBar } from "@/components/UserBar";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");

  const [students, sessions] = await Promise.all([
    getStudentsForUser(user.id),
    getSessionsForUser(user.id),
  ]);

  const totalPresent = sessions.flatMap(s => s.attendance).length;
  const totalComplete = sessions
    .flatMap(s => s.attendance)
    .filter(a => a.projectStatus === "COMPLETE").length;
  const completionRate =
    totalPresent > 0 ? Math.round((totalComplete / totalPresent) * 100) : 0;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <UserBar name={user.name} role={user.role} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>
          {user.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          Youth Coding Coordinator
        </Typography>

        {/* Stats */}
        <Box sx={{ display: "flex", gap: 4, mb: 5, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>{students.length}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Registered Students</Typography>
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>{sessions.length}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Sessions Submitted</Typography>
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>{completionRate}%</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>Completion Rate</Typography>
          </Box>
        </Box>

        {/* Navigation */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Box
            component={Link}
            href="/submit-session"
            sx={{
              px: 3, py: 2, border: "1px solid", borderColor: "divider",
              borderRadius: 2, textDecoration: "none", color: "text.primary",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>Submit Session →</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Record today's session</Typography>
          </Box>
          <Box
            component={Link}
            href="/student/students"
            sx={{
              px: 3, py: 2, border: "1px solid", borderColor: "divider",
              borderRadius: 2, textDecoration: "none", color: "text.primary",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>My Students →</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>View registered students</Typography>
          </Box>
        </Box>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>Recent Sessions</Typography>
            {sessions.slice(0, 5).map(s => (
              <Box
                key={s.id}
                sx={{ py: 1.5, borderBottom: "1px solid", borderBottomColor: "divider" }}
              >
                <Typography variant="body2">
                  Lesson {s.lessonNumber} — {s.projectName}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {new Date(s.date).toLocaleDateString()} · {s.attendance.length} students ·{" "}
                  {s.school}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/student/page.tsx
git commit -m "feat(student): add STUDENT role dashboard page"
```

---

## Task 10: Submit Session Page

**Files:**
- Create: `apps/web/src/app/submit-session/page.tsx`

- [ ] **Step 1: Create submit-session page**

```typescript
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser, getDepartmentUsersForSession } from "@/modules/youth-coding/queries";
import { SessionForm } from "@/modules/youth-coding/components/SessionForm";
import { UserBar } from "@/components/UserBar";

export default async function SubmitSessionPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");

  const [existingStudents, departmentUsers] = await Promise.all([
    getStudentsForUser(user.id),
    getDepartmentUsersForSession(user.departmentId),
  ]);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderBottomColor: "divider",
          bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <UserBar name={user.name} role={user.role} />
              <Typography
                component={Link}
                href="/student"
                sx={{ fontSize: "0.75rem", color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}
              >
                ← Dashboard
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ fontSize: "2.5rem", mb: 1, letterSpacing: "-0.02em" }}>
          Submit Session
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          Record attendance and project progress for today's youth coding session.
        </Typography>

        <SessionForm
          userId={user.id}
          departmentId={user.departmentId}
          existingStudents={existingStudents}
          departmentUsers={departmentUsers}
        />
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/submit-session/page.tsx
git commit -m "feat(student): add submit-session page"
```

---

## Task 11: My Students Page

**Files:**
- Create: `apps/web/src/app/student/students/page.tsx`

- [ ] **Step 1: Create My Students page**

The page is a client component to support filter input and inline editing. Fetch students server-side and pass as props.

Create `apps/web/src/app/student/students/page.tsx` as a thin server wrapper:

```typescript
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentsForUser } from "@/modules/youth-coding/queries";
import { MyStudentsClient } from "@/modules/youth-coding/components/MyStudentsClient";

export default async function MyStudentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") redirect("/login");
  const students = await getStudentsForUser(user.id);
  return <MyStudentsClient user={user} students={students} />;
}
```

Then create `apps/web/src/modules/youth-coding/components/MyStudentsClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Box, Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, IconButton, Select, MenuItem,
} from "@mui/material";
import Link from "next/link";
import { updateStudent } from "../actions/updateStudent";
import { UserBar } from "@/components/UserBar";

interface Student {
  id: string; name: string; age: number; gender: string;
  school: string; grade: string; community: string; enrollmentStatus: string;
}

export function MyStudentsClient({ user, students: initial }: { user: { name: string; role: string }; students: Student[] }) {
  const [students, setStudents] = useState(initial);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Student>>({});

  const filtered = students.filter(
    s => !filter || s.school.toLowerCase().includes(filter.toLowerCase()),
  );

  function startEdit(s: Student) {
    setEditing(s.id);
    setDraft({ name: s.name, age: s.age, gender: s.gender, school: s.school, grade: s.grade, community: s.community });
  }

  async function saveEdit(id: string) {
    const result = await updateStudent(id, draft);
    if (result.success) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...draft } : s));
      setEditing(null);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box></Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <UserBar name={user.name} role={user.role} />
              <Typography component={Link} href="/student" sx={{ fontSize: "0.75rem", color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>← Dashboard</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>My Students</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>{students.length} registered youth coding students</Typography>

        <TextField
          label="Filter by school"
          size="small"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          sx={{ mb: 3, width: 240 }}
        />

        {filtered.length === 0 ? (
          <Typography sx={{ color: "text.secondary" }}>No students registered yet. Submit your first session to register students.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell><TableCell>Age</TableCell><TableCell>Gender</TableCell>
                <TableCell>School</TableCell><TableCell>Grade</TableCell><TableCell>Community</TableCell>
                <TableCell>Status</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  {editing === s.id ? (
                    <>
                      <TableCell><TextField size="small" value={draft.name ?? ""} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={draft.age ?? ""} onChange={e => setDraft(d => ({ ...d, age: Number(e.target.value) }))} sx={{ width: 60 }} /></TableCell>
                      <TableCell>
                        <Select size="small" value={draft.gender ?? ""} onChange={e => setDraft(d => ({ ...d, gender: e.target.value }))}>
                          <MenuItem value="M">M</MenuItem><MenuItem value="F">F</MenuItem><MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell><TextField size="small" value={draft.school ?? ""} onChange={e => setDraft(d => ({ ...d, school: e.target.value }))} /></TableCell>
                      <TableCell><TextField size="small" value={draft.grade ?? ""} onChange={e => setDraft(d => ({ ...d, grade: e.target.value }))} sx={{ width: 80 }} /></TableCell>
                      <TableCell><TextField size="small" value={draft.community ?? ""} onChange={e => setDraft(d => ({ ...d, community: e.target.value }))} /></TableCell>
                      <TableCell>{s.enrollmentStatus}</TableCell>
                      <TableCell><IconButton size="small" onClick={() => saveEdit(s.id)}>✓</IconButton></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{s.name}</TableCell><TableCell>{s.age}</TableCell><TableCell>{s.gender}</TableCell>
                      <TableCell>{s.school}</TableCell><TableCell>{s.grade}</TableCell><TableCell>{s.community}</TableCell>
                      <TableCell>{s.enrollmentStatus}</TableCell>
                      <TableCell><IconButton size="small" onClick={() => startEdit(s)}>✎</IconButton></TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Container>
    </Box>
  );
}
```
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/student/students/page.tsx
git commit -m "feat(student): add My Students page"
```

---

## Task 12: YC Master Database Page

**Files:**
- Create: `apps/web/src/app/youth-coding/page.tsx`

- [ ] **Step 1: Create YC Master Database page**

This is a client component to support filters and CSV export. Create a thin server wrapper at `apps/web/src/app/youth-coding/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getYCMasterList } from "@/modules/youth-coding/queries";
import { YCMasterClient } from "@/modules/youth-coding/components/YCMasterClient";

const HUB_LEAD_AND_ABOVE = ["HUB_LEAD", "BOOTCAMP_MANAGER", "PROGRAM_MANAGER", "COUNTRY_DIRECTOR", "ADMIN"];

export default async function YCMasterDatabasePage() {
  const user = await getSessionUser();
  if (!user || !HUB_LEAD_AND_ABOVE.includes(user.role)) redirect("/login");
  const students = await getYCMasterList();
  return <YCMasterClient user={user} students={students} />;
}
```

Then create `apps/web/src/modules/youth-coding/components/YCMasterClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import {
  Box, Container, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, Select, MenuItem, FormControl, InputLabel, Button,
} from "@mui/material";
import { UserBar } from "@/components/UserBar";

interface YCStudent {
  id: string; name: string; age: number; gender: string; school: string;
  grade: string; community: string;
  department: { id: string; name: string };
  instructor: { id: string; name: string };
  sessionAttendance: { projectStatus: string }[];
}

export function YCMasterClient({ user, students }: { user: { name: string; role: string }; students: YCStudent[] }) {
  const [hubFilter, setHubFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const hubs = useMemo(() => [...new Set(students.map(s => s.department.name))].sort(), [students]);
  const schools = useMemo(() => [...new Set(students.map(s => s.school))].sort(), [students]);
  const grades = useMemo(() => [...new Set(students.map(s => s.grade))].sort(), [students]);

  const filtered = students.filter(s =>
    (!hubFilter || s.department.name === hubFilter) &&
    (!schoolFilter || s.school === schoolFilter) &&
    (!genderFilter || s.gender === genderFilter) &&
    (!gradeFilter || s.grade === gradeFilter),
  );

  function exportCSV() {
    const header = "Name,Age,Gender,School,Grade,Community,Hub,Coordinator,Sessions,Completion";
    const rows = filtered.map(s => {
      const total = s.sessionAttendance.length;
      const complete = s.sessionAttendance.filter(a => a.projectStatus === "COMPLETE").length;
      const rate = total > 0 ? Math.round((complete / total) * 100) : 0;
      return [s.name, s.age, s.gender, s.school, s.grade, s.community, s.department.name, s.instructor.name, total, `${rate}%`].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "yc-students.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderBottomColor: "divider", bgcolor: "rgb(var(--mui-palette-background-defaultChannel) / 0.8)", backdropFilter: "blur(12px)" }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ color: "text.primary" }}>Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box></Typography>
            <UserBar name={user.name} role={user.role} />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1, letterSpacing: "-0.02em" }}>Youth Coding Master Database</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{filtered.length} of {students.length} students</Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={exportCSV}>Export CSV</Button>
        </Box>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Hub</InputLabel>
            <Select value={hubFilter} label="Hub" onChange={e => setHubFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {hubs.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>School</InputLabel>
            <Select value={schoolFilter} label="School" onChange={e => setSchoolFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {schools.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Gender</InputLabel>
            <Select value={genderFilter} label="Gender" onChange={e => setGenderFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="M">M</MenuItem><MenuItem value="F">F</MenuItem><MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Grade</InputLabel>
            <Select value={gradeFilter} label="Grade" onChange={e => setGradeFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {grades.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Age</TableCell><TableCell>Gender</TableCell>
              <TableCell>School</TableCell><TableCell>Grade</TableCell><TableCell>Community</TableCell>
              <TableCell>Hub</TableCell><TableCell>Coordinator</TableCell>
              <TableCell>Sessions</TableCell><TableCell>Completion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(s => {
              const total = s.sessionAttendance.length;
              const complete = s.sessionAttendance.filter(a => a.projectStatus === "COMPLETE").length;
              const rate = total > 0 ? Math.round((complete / total) * 100) : 0;
              return (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell><TableCell>{s.age}</TableCell><TableCell>{s.gender}</TableCell>
                  <TableCell>{s.school}</TableCell><TableCell>{s.grade}</TableCell><TableCell>{s.community}</TableCell>
                  <TableCell>{s.department.name}</TableCell><TableCell>{s.instructor.name}</TableCell>
                  <TableCell>{total}</TableCell><TableCell>{rate}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/youth-coding/page.tsx
git commit -m "feat(youth-coding): add YC Master Database page"
```

---

## Task 13: Dashboard Modifications

**Files:**
- Modify: `apps/web/src/modules/dashboards/instructor/queries.ts`
- Modify: `apps/web/src/modules/dashboards/bootcamp/queries.ts`
- Modify: `apps/web/src/modules/dashboards/country/queries.ts`
- Modify: `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx`
- Modify: `apps/web/src/app/departments/[departmentId]/page.tsx`
- Modify: `apps/web/src/app/bootcamps/[departmentId]/page.tsx`
- Modify: `apps/web/src/app/country/page.tsx`

- [ ] **Step 1: Update the instructor dashboard page import**

All YC queries are in `apps/web/src/modules/youth-coding/queries.ts`. Import directly from there in all dashboard pages — no re-export needed through the dashboard query files.

- [ ] **Step 2: Add YC panel to instructor dashboard page**

Open `apps/web/src/app/departments/[departmentId]/instructors/[userId]/page.tsx`.

Add to the parallel data fetch (alongside existing queries):
```typescript
const ycSummary = await getYCInstructorSummary(userId);
```

Add the `YCPanel` import:
```typescript
import { YCPanel } from "@/modules/youth-coding/components/YCPanel";
```

Add `<YCPanel>` in the JSX, after the existing stats section:
```tsx
<YCPanel
  uniqueStudents={ycSummary.uniqueYouthStudents}
  sessionCount={ycSummary.sessionsThisWeek}
  completionRate={ycSummary.completionRate}
  label="Youth Coding (This Week)"
/>
```

- [ ] **Step 3: Add YC panel to hub dashboard page**

Open `apps/web/src/app/departments/[departmentId]/page.tsx`.

Add import:
```typescript
import { getYCHubSummary } from "@/modules/youth-coding/queries";
import { YCPanel } from "@/modules/youth-coding/components/YCPanel";
```

Add to data fetch:
```typescript
const ycSummary = await getYCHubSummary(departmentId);
```

Add in JSX:
```tsx
<YCPanel
  uniqueStudents={ycSummary.uniqueStudentCount}
  sessionCount={ycSummary.sessionsThisMonth}
  completionRate={ycSummary.completionRate}
  schoolBreakdown={Object.entries(ycSummary.schoolBreakdown).map(([school, count]) => ({ school, count }))}
/>
```

- [ ] **Step 4: Add YC panel to bootcamp dashboard page**

Open `apps/web/src/app/bootcamps/[departmentId]/page.tsx`.

You need the IDs of all hub departments under this bootcamp. The bootcamp page already fetches hubs — reuse that data. Add:

```typescript
import { getYCBootcampAggregate } from "@/modules/youth-coding/queries";
import { YCPanel } from "@/modules/youth-coding/components/YCPanel";
```

After hubs are fetched:
```typescript
const hubIds = hubs.map((h: { id: string }) => h.id);
const ycSummary = await getYCBootcampAggregate(hubIds);
```

Add in JSX:
```tsx
<YCPanel
  uniqueStudents={ycSummary.uniqueStudentCount}
  sessionCount={ycSummary.sessionsThisMonth}
/>
```

- [ ] **Step 5: Add YC panel to country dashboard page**

Open `apps/web/src/app/country/page.tsx`.

The country page calls `getCountryDashboardData()` which already returns `hubs` (an array of `{ id, parentDepartmentId }`). Add:

```typescript
import { getYCOrgSummary } from "@/modules/youth-coding/queries";
import { YCPanel } from "@/modules/youth-coding/components/YCPanel";
```

After destructuring the result of `getCountryDashboardData()`, add:
```typescript
const allHubIds = hubs.map((h: { id: string }) => h.id);
const ycSummary = await getYCOrgSummary(allHubIds);
```

Add in JSX:
```tsx
<YCPanel
  uniqueStudents={ycSummary.totalUniqueStudents}
  sessionCount={ycSummary.sessionsThisMonth}
  genderBreakdown={ycSummary.genderBreakdown}
  schoolCount={ycSummary.schoolCount}
  label="Youth Coding — Org Wide"
/>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/modules/dashboards/ apps/web/src/app/departments/ apps/web/src/app/bootcamps/ apps/web/src/app/country/
git commit -m "feat(dashboards): add Youth Coding panels to instructor, hub, bootcamp, country dashboards"
```

---

## Task 14: Seed Data

**Files:**
- Modify: `packages/db/prisma/seed.ts`

- [ ] **Step 1: Add STUDENT users, youth students, and sessions to seed**

At the end of the seed file (before `main()` closes), add the following seeding block. Call it from inside `main()` after the existing hub/instructor/student seeding:

```typescript
// ── Youth Coding seed ────────────────────────────────────────────────────────

const YC_SCHOOLS = ["Greenfield Primary", "Riverside Academy", "Sunside Community School"];
const YC_COMMUNITIES = ["Westlands", "Eastbourne", "Northgate"];
const YC_GRADES = ["Grade 5", "Grade 6", "Grade 7", "Grade 8"];
const YC_GENDERS = ["M", "F", "Other"] as const;

async function seedYouthCoding(hubs: { id: string }[]) {
  for (let h = 0; h < hubs.length; h++) {
    const hub = hubs[h];
    // Get the first instructor in this hub by createdAt ASC
    const firstInstructor = await prisma.user.findFirst({
      where: { departmentId: hub.id, role: Role.INSTRUCTOR },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!firstInstructor) continue;

    // Create 1 STUDENT user per hub
    const studentUser = await prisma.user.create({
      data: {
        email: `yc.coordinator.hub${h + 1}@uncommon.org`,
        name: `YC Coordinator Hub ${h + 1}`,
        role: Role.STUDENT,
        departmentId: hub.id,
      },
    });

    // Register 5 youth coding students
    const youthStudents = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.student.create({
          data: {
            name: studentName(h * 5 + i + 100),
            age: 7 + (i % 5),
            gender: YC_GENDERS[i % 3],
            school: YC_SCHOOLS[h % YC_SCHOOLS.length],
            grade: YC_GRADES[i % YC_GRADES.length],
            community: YC_COMMUNITIES[h % YC_COMMUNITIES.length],
            departmentId: hub.id,
            instructorId: studentUser.id,
            enrollmentStatus: "ACTIVE",
          },
        }),
      ),
    );

    // Submit 3 sessions per STUDENT user
    for (let s = 0; s < 3; s++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - (s * 3));

      await prisma.youthCodingSession.create({
        data: {
          date: sessionDate,
          lessonNumber: s + 1,
          projectName: `Project Alpha - Lesson ${s + 1}`,
          school: YC_SCHOOLS[h % YC_SCHOOLS.length],
          community: YC_COMMUNITIES[h % YC_COMMUNITIES.length],
          departmentId: hub.id,
          submittedById: studentUser.id,
          instructorIds: [firstInstructor.id],
          attendance: {
            create: youthStudents.map((ys, i) => ({
              studentId: ys.id,
              projectStatus: i % 2 === 0 ? "COMPLETE" : "NOT_COMPLETE",
            })),
          },
        },
      });
    }
  }
}
```

Wire it up in `main()` after the existing hub seeding completes:

```typescript
await seedYouthCoding(hubs);
```

- [ ] **Step 2: Add `ProjectStatus` to the Prisma imports at the top of seed.ts**

Find the existing import block and add `ProjectStatus`:
```typescript
import {
  PrismaClient,
  Role,
  // ... existing imports ...
  ProjectStatus,
} from "@prisma/client";
```

- [ ] **Step 3: Run the seed**

```bash
cd packages/db && DATABASE_URL="$(grep DATABASE_URL ../../apps/web/.env.local | cut -d= -f2-)" npx tsx prisma/seed.ts
```

Expected: seed completes without errors.

- [ ] **Step 4: Verify in the running app**

Start dev server: `cd apps/web && pnpm dev`

Log in as `yc.coordinator.hub1@uncommon.org` (any password works in demo mode). Confirm redirect to `/student`. Check that 5 students appear on `/student/students` and 3 sessions appear on the dashboard.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(seed): add STUDENT users, youth coding students, and session data"
```

---

## Task 15: Deploy

- [ ] **Step 1: Push schema to production database**

```bash
cd packages/db && npx prisma db push
```

This uses the `DATABASE_URL` from the environment. Confirm with the production DATABASE_URL set in Vercel.

- [ ] **Step 2: Run seed against production database**

> **Warning:** The seed script is not idempotent — re-running it will create duplicate STUDENT users. Only run this once against production. If the seed has already partially run, check for existing `yc.coordinator.hub*` users before running.

```bash
DATABASE_URL="<production pooler URL>" npx tsx packages/db/prisma/seed.ts
```

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel deploy --prod
```

- [ ] **Step 4: Smoke test**

Visit `https://org-os-web.vercel.app`. Log in as `yc.coordinator.hub1@uncommon.org`. Confirm:
- Redirected to `/student`
- Stats show 5 students, 3 sessions
- `/student/students` shows the student roster
- Hub dashboard shows YC panel with student counts
- `/youth-coding` shows the master database table
